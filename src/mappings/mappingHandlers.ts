import {SubstrateEvent, SubstrateExtrinsic} from "@subql/types";
import { EventRecord, Balance } from '@polkadot/types/interfaces';
import {Gift, GiftExtrinsic} from "../types";
import {GiftRemarkStatus, GiftStatus, GiftAction} from './constants';

function findTransferEvent(events: EventRecord[]): EventRecord | undefined {
    return events.find((event) => {
        const { section, method } = event.event;
        return section === 'balances' && method === 'Transfer';
    });
}

async function buildGiftExtrinsic(
    owner: string,
    giftID: string,
    action: GiftAction,
    extrinsic: SubstrateExtrinsic
): Promise<string> {
    const extrinsicHash = extrinsic.extrinsic.hash.toString();
    const giftExtrinsic = new GiftExtrinsic(extrinsicHash);

    giftExtrinsic.owner = owner.toString();
    giftExtrinsic.giftID = giftID;
    giftExtrinsic.action = action;
    giftExtrinsic.timestamp = extrinsic.block.timestamp;
    giftExtrinsic.blockNumber = extrinsic.block.block.header.number.toBigInt();
    await giftExtrinsic.save();

    return extrinsicHash;
}

async function handleGiftCreated(extrinsic: SubstrateExtrinsic) {
    const event = findTransferEvent(extrinsic.events);
    if (event) {
        const [creator, giftID, amount] = event.event.data;
        const ceateExtrinsicId = await buildGiftExtrinsic(
            creator.toString(),
            giftID.toString(),
            GiftAction.CREATE, 
            extrinsic
        );

        const gift = new Gift(giftID.toString());
        gift.address = giftID.toString();
        gift.creator = creator.toString();
        gift.amount = (amount as Balance).toBigInt();
        gift.status = GiftStatus.CREATED;
        gift.ceateExtrinsicId = ceateExtrinsicId;
        await gift.save();
    }
};

async function handleGiftClaimed(extrinsic: SubstrateExtrinsic) {
    const event = findTransferEvent(extrinsic.events);
    if (event) {
        const [giftID, claimer] = event.event.data;
        const claimExtrinsicId = await buildGiftExtrinsic(
            giftID.toString(),
            giftID.toString(),
            GiftAction.CLAIM, 
            extrinsic
        );

        const gift = await Gift.get(giftID.toString());
        if (gift) {
            gift.claimer = claimer.toString();
            gift.status = GiftStatus.CLAIMED;
            gift.claimExtrinsicId = claimExtrinsicId;
            await gift.save();
        }
    }
}

async function handleGiftRemoved(extrinsic: SubstrateExtrinsic) {
    const event = findTransferEvent(extrinsic.events);
    if (event) {
        const [giftID] = event.event.data;
        const removeExtrinsicId = await buildGiftExtrinsic(
            giftID.toString(),
            giftID.toString(),
            GiftAction.REMOVE, 
            extrinsic
        );

        const gift = await Gift.get(giftID.toString());
        if (gift) {
            gift.removeExtrinsicId = removeExtrinsicId;
            gift.status = GiftStatus.REMOVED;
            await gift.save();
        }
    }
}

export async function handleRemark(event: SubstrateEvent): Promise<void> {
    const { event: { data }, extrinsic } = event;
    if (!extrinsic.success || data.length < 2) return;

    const remark = data[1].toString();
    switch (remark) {
        case GiftRemarkStatus.CREATED:
            await handleGiftCreated(extrinsic);
            return;
        case GiftRemarkStatus.CLAIMED:
            await handleGiftClaimed(extrinsic);
            return;
        case GiftRemarkStatus.REMOVED:
            await handleGiftRemoved(extrinsic);
            return;
        default:
            return;
    }
}
