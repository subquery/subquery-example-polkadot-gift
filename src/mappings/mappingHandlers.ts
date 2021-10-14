import {SubstrateEvent, SubstrateExtrinsic} from "@subql/types";
import { EventRecord, Balance } from '@polkadot/types/interfaces';
import {Gift} from "../types";

// `gift::create`
const GIFT_CREATED = '0xa29b801235241a572e6fda5836a6bd530fa21ce81bbfe98062386e51fb92ed94'; 
// `gift::claim`
const GIFT_CLAIMED = '0x297c7313d5dccc8aa8b133b47bda0e61c7ca3da870d676972f5412b3a732c74e';

// TODO: move to handlers file
function findTransferEvent(events: EventRecord[]) {
    return events.find((event) => {
        const { section, method } = event.event;
        return section === 'balances' && method === 'transfer';
    });
}

async function handleGiftCreated(extrinsic: SubstrateExtrinsic) {
    const { events, extrinsic: ext } = extrinsic;
    const event = findTransferEvent(events);
    if (event) {
        const [creater, owner, amount] = event.event.data;
        const gift = new Gift(owner.toString());
        gift.creater = creater.toString();
        gift.amount = (amount as Balance).toBigInt();
        await gift.save();
    }
};

async function handleGiftClaimed(extrinsic: SubstrateExtrinsic) {
    const { events, extrinsic: ext } = extrinsic;
    const event = findTransferEvent(events);
    if (event) {
        const [from, to] = event.event.data;
        const gift = await Gift.get(from.toString());
        gift.receiver = to.toString();
        await gift.save();
    }
}

export async function handleRemark(event: SubstrateEvent): Promise<void> {
    const { event: { data }, extrinsic } = event;  
    // const [owner, remark] = data;
    const [from, to, amount] = data;
    
    const gift = new Gift(from.toString());
    gift.address = from.toString();
    gift.creater = to.toHex();
    gift.amount = (amount as Balance).toBigInt();

    await gift.save();

    // if (remark.toString() === GIFT_CREATED) {
    //     // await handleGiftCreated(extrinsic);
    // } else if (remark.toString() === GIFT_CLAIMED) {
    //     // await handleGiftClaimed(extrinsic);
    // }
}

export async function handleCall(extrinc: SubstrateExtrinsic) {
    const {} = extrinc;

    logger.info(`extrinc: ${extrinc.extrinsic.signature.toString()}`);
}