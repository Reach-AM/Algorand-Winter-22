/* eslint-disable */
import algosdk from "algosdk";
import { getAlgodClient } from "./client.js";
import wallets from "./wallets.js";
import { convertByte32ToIpfsCidV0 } from "../scripts/helpers/ipfs2bytes32.js";

const purchaseNFT = async (creator, receiver, nftId, fungibleTokenId, network) => {
    // Set up
    if (!(creator && receiver && nftId && fungibleTokenId)) {
        console.error("error",creator, receiver, nftId, fungibleTokenId);
        return;
    }

    const algodClient = getAlgodClient(network);
    const suggestedParams = await algodClient.getTransactionParams().do();

    // NFT opt-in
    let txnOptIn = algosdk.makeAssetTransferTxnWithSuggestedParams(
        receiver,
        receiver,
        undefined,
        undefined,
        0,
        undefined,
        nftId,
        suggestedParams
    );

    // NFT transfer
    const one = 1;
    let txnNFT = algosdk.makeAssetTransferTxnWithSuggestedParams(
        creator,
        receiver,
        undefined,
        undefined,
        one,
        undefined,
        nftId,
        suggestedParams
    );

    // Fungible token transfer
    const cost = 5;
    let txnFungi = algosdk.makeAssetTransferTxnWithSuggestedParams(
        receiver,
        creator,
        undefined,
        undefined,
        cost,
        undefined,
        fungibleTokenId,
        suggestedParams
    );

    //Atomic Transfer
    let txns = [txnOptIn, txnNFT, txnFungi];
    return await wallets.sendAlgoSignerTransaction(txns, algodClient);
}

const getAccountInfo = async (address, network) => {
    const algodClient = getAlgodClient(network);

    return await algodClient.accountInformation(address).do();
};

const checkMetadataHash = (uint8ArrHash, assetURL) => {
    // convert uint8array to hex string
    let metadataHash = Buffer.from(uint8ArrHash).toString("hex");

    // get IPFS cid of json metadata 
    const cid = convertByte32ToIpfsCidV0(metadataHash);

    // check if cid from assetURL is the same as cid extracted from metadata hash
    let cid_from_assetURL = assetURL.replace("ipfs://", "");
    cid_from_assetURL = cid_from_assetURL.replace("#arc3", "");

    return cid_from_assetURL === cid;
}

export default {
    purchaseNFT,
    checkMetadataHash,
    getAccountInfo,
};