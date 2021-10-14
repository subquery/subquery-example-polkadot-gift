import {SubstrateEvent, SubstrateExtrinsic} from "@subql/types";
import { EventRecord, Balance } from '@polkadot/types/interfaces';
import {Gift, GiftExtrinsic} from "../types";

enum GiftStatus {
  // `gift::create`
  CREATED = '0xa29b801235241a572e6fda5836a6bd530fa21ce81bbfe98062386e51fb92ed94',
  // `gift::claim`
  CLAIMED = '0x297c7313d5dccc8aa8b133b47bda0e61c7ca3da870d676972f5412b3a732c74e',
  // `gift::remove`
  REMOVED = '0x4053cb611af36c422c9d6914ca3bde8862deea45aad4be9c180044a27511e66a',
}

function findTransferEvent(events: EventRecord[]): EventRecord | undefined {
    return events.find((event) => {
        const { section, method } = event.event;
        return section === 'balances' && method === 'Transfer';
    });
}

async function handleGiftCreated(extrinsic: SubstrateExtrinsic) {
    const event = findTransferEvent(extrinsic.events);
    if (event) {
        const [creator, owner, amount] = event.event.data;
        const extrinsicHash = extrinsic.extrinsic.hash.toString();

        const gift = new Gift(owner.toString());
        gift.creator = creator.toString();
        gift.address = owner.toString();
        gift.amount = (amount as Balance).toBigInt();
        gift.ceateExtrinsic = extrinsicHash;
        await gift.save();

        const giftExtrinsic = new GiftExtrinsic(extrinsicHash);
        giftExtrinsic.giftID = owner.toString();
        await giftExtrinsic.save();
    }
};

async function handleGiftClaimed(extrinsic: SubstrateExtrinsic) {
    const event = findTransferEvent(extrinsic.events);
    if (event) {
        const extrinsicHash = extrinsic.extrinsic.hash.toString();
        const [from, to] = event.event.data;

        const gift = await Gift.get(from.toString());
        gift.claimExtrinsic = extrinsicHash;
        gift.claimer = to.toString();
        await gift.save();
    }
}

export async function handleRemark(event: SubstrateEvent): Promise<void> {
    const { event: { data }, extrinsic } = event;
    if (data.length < 2) return;

    const [owner, remark] = data;
    switch (remark.toString()) {
        case GiftStatus.CREATED:
            await handleGiftCreated(extrinsic);
        case GiftStatus.CLAIMED:
            await handleGiftClaimed(extrinsic);
        case GiftStatus.REMOVED:
            await Gift.remove(owner.toString());
        default:
            return;
    }
}
