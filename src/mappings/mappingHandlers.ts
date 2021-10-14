import {SubstrateEvent, SubstrateExtrinsic} from "@subql/types";
import { EventRecord, Balance } from '@polkadot/types/interfaces';
import {Gift, GiftExtrinsic} from "../types";
import {GiftRemarkStatus} from './constants';

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
        if (gift) {
            gift.claimExtrinsic = extrinsicHash;
            gift.claimer = to.toString();
            await gift.save();
        }
    }
}

export async function handleRemark(event: SubstrateEvent): Promise<void> {
    const { event: { data }, extrinsic } = event;
    if (!extrinsic.success || data.length < 2) return;

    const [owner, remark] = data;
    switch (remark.toString()) {
        case GiftRemarkStatus.CREATED:
            await handleGiftCreated(extrinsic);
            return;
        case GiftRemarkStatus.CLAIMED:
            await handleGiftClaimed(extrinsic);
            return;
        case GiftRemarkStatus.REMOVED:
            await Gift.remove(owner.toString());
            return;
        default:
            return;
    }
}
