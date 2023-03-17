import algosdk from "algosdk";
import { getAlgodClient } from "./client.js";
import wallets from "./wallets.js";

const getExplorerURL = (txId, network) => {
    switch (network) {
        case "TestNet":
            return "https://testnet.algoexplorer.io/tx/" + txId;
        default:
            return "http://localhost:8980/v2/transactions/" + txId + "?pretty";
    }
};

const AssetOptIn = async (sender, assetID, algodClient, suggestedParams) => {
    // Check if Asset is in Account's assets
    if (!(sender && assetID && algodClient && suggestedParams)) {
        console.error("error", sender, assetID, algodClient, suggestedParams);
        return;
    }

    let accountAssets = await algodClient.accountInformation(sender).do();

    for (let i = 0; i < accountAssets.assets.length; i++) {
        let asset = accountAssets.assets[i];
        if(asset['asset-id']== assetID) {
            return;
        }
    }

    let txnOptIn = algosdk.makeAssetTransferTxnWithSuggestedParams(
        sender,
        sender,
        undefined,
        undefined,
        0,
        undefined,
        assetID,
        suggestedParams
    );

    let txns = [txnOptIn];
    return await wallets.sendAlgoSignerTransaction(txns, algodClient);
};

const buyAsset = async (sender, appID, receiver, assetID, amount, network) => {
    if (!(sender && appID && receiver && assetID && amount && network) || amount == 0 || amount > 1000) {
        console.error("error", sender, appID, receiver, assetID, amount, network);
        return;
    }

    const amountSend = parseInt(amount);

    // Create AlgodClient && suggested Params

    const algodClient = getAlgodClient(network);
    const suggestedParams = await algodClient.getTransactionParams().do();

    // Check if account has opted into Asset before
    await AssetOptIn(sender, assetID, algodClient, suggestedParams);

    let holdingsAccount = await algodClient.getApplicationByID(appID).do();
    let currentPrice = holdingsAccount.params['global-state'][0]['value']['uint'];
    let payment = parseInt((amountSend*currentPrice)+1000);
    
    let txnPay = algosdk.makePaymentTxnWithSuggestedParams(
        sender,
        receiver,
        payment,
        undefined,
        undefined,
        suggestedParams,
        undefined
    );
    
    const operationU8A = algosdk.encodeObj("SellTokens").slice(1);
    const amountU8A = algosdk.bigIntToBytes(amountSend,8);


    let appArgs = [operationU8A, amountU8A];
    let foreignAssets = [assetID];
    let txnAppCall = algosdk.makeApplicationNoOpTxn(
        sender,
        suggestedParams,
        appID,
        appArgs,
        undefined,
        undefined,
        foreignAssets
    );

    let txns = [txnPay, txnAppCall];

    return await wallets.sendAlgoSignerTransaction(txns, algodClient);
}

const getAmountLeft = async (address, assetId, network) => {
    if (!(address && assetId && network)) {
        console.error("error", address, assetId, network);
        return;
    }

    const algodClient = getAlgodClient(network);
    let holdingsAccount = await algodClient.accountInformation(address).do();

    for (let i = 0; i < holdingsAccount.assets.length; i++) {
        let asset = holdingsAccount.assets[i];
        if(asset['asset-id']==assetId) {
            return asset['amount'];
        } else {
            return 0;
        }
    }
}

export {
    getExplorerURL,
    buyAsset,
    getAmountLeft
};
