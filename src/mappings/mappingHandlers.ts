import {SubstrateEvent, SubstrateExtrinsic} from "@subql/types";
import { EventRecord, Balance } from '@polkadot/types/interfaces';
import {Gift, GiftExtrinsic} from "../types";

// `gift::create`
const GIFT_CREATED = '0xa29b801235241a572e6fda5836a6bd530fa21ce81bbfe98062386e51fb92ed94'; 
// `gift::claim`
const GIFT_CLAIMED = '0x297c7313d5dccc8aa8b133b47bda0e61c7ca3da870d676972f5412b3a732c74e';

function findTransferEvent(events: EventRecord[]): EventRecord | undefined {
    return events.find((event) => {
        const { section, method } = event.event;
        return section === 'balances' && method === 'Transfer';
    });
}

async function handleGiftCreated(extrinsic: SubstrateExtrinsic) {
    const event = findTransferEvent(extrinsic.events);
    if (event) {
        const [creater, owner, amount] = event.event.data;
        const extrinsicHash = extrinsic.extrinsic.hash.toString();

        const gift = new Gift(owner.toString());
        gift.creater = creater.toString();
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

    const remark = data[1];
    if (remark.toString() === GIFT_CREATED) {
        await handleGiftCreated(extrinsic);
    } else if (remark.toString() === GIFT_CLAIMED) {
        await handleGiftClaimed(extrinsic);
    }
}
