const { convert } = require("@algo-builder/algob");
const { types } = require("@algo-builder/web");

const initContract = (runtime, account, approvalFile, clearStateFile, foreignAssets, globalInts = 0, globalBytes = 0) => {
    // deploy contract
    runtime.deployApp(
        approvalFile,
        clearStateFile,
        {
            sender: account,
            localInts: 0,
            localBytes: 0,
            globalInts: globalInts,
            globalBytes: globalBytes,
            foreignAssets: foreignAssets
        },
        { totalFee: 1000 },
        {}
    );

    const appInfo = runtime.getAppInfoFromName(approvalFile, clearStateFile);
    const appAddress = appInfo.applicationAccount;

    // fund the contract
    runtime.executeTx({
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: account,
        toAccountAddr: appAddress,
        amountMicroAlgos: 10e6,
        payFlags: { totalFee: 1000 }
    });

    return appInfo;
};

const appCall = (runtime, account, appID, appArgs, accounts = [], foreignAssets = []) => {
    runtime.executeTx({
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: account,
        appID: appID,
        accounts: accounts,
        appArgs: appArgs,
        foreignAssets: foreignAssets,
        payFlags: { totalFee: 1000 }
    });
};

const optInAsset = (runtime, account, assetID) => {
    runtime.executeTx({
        type: types.TransactionType.TransferAsset,
        sign: types.SignType.SecretKey,
        fromAccount: account,
        toAccountAddr: account.addr,
        amount: 0,
        assetID: assetID,
        payFlags: { totalFee: 1000 }
    });
};

const buyAssets = (runtime, account, appInfo, foreignAssets, amount) => {
    const appAddress = appInfo.applicationAccount;
    const price = Number(runtime.getGlobalState(appInfo.appID, "Price"));
    const payment = (amount*price)+1000;

    runtime.executeTx([
        { // Pay for the Assets
            type: types.TransactionType.TransferAlgo,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            toAccountAddr: appAddress,
            amountMicroAlgos: payment,
            payFlags: { totalFee: 1000 }
        },
        {// App Call to sell assets
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appInfo.appID,
            appArgs: [convert.stringToBytes("SellTokens"), convert.uint64ToBigEndian(amount)],
            foreignAssets: foreignAssets,
            payFlags: { totalFee: 1000 }
        }
    ]);

    return appInfo;
};

const buyAssetsInsuf = (runtime, account, appInfo, foreignAssets, amount) => {
    const appAddress = appInfo.applicationAccount;
    const price = Number(runtime.getGlobalState(appInfo.appID, "Price"));
    const payment = (amount*(price-1))+1000;

    runtime.executeTx([
        { // Pay for the Assets
            type: types.TransactionType.TransferAlgo,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            toAccountAddr: appAddress,
            amountMicroAlgos: payment,
            payFlags: { totalFee: 1000 }
        },
        {// App Call to sell assets
            type: types.TransactionType.CallApp,
            sign: types.SignType.SecretKey,
            fromAccount: account,
            appID: appInfo.appID,
            appArgs: [convert.stringToBytes("SellTokens"), convert.uint64ToBigEndian(amount)],
            foreignAssets: foreignAssets,
            payFlags: { totalFee: 1000 }
        }
    ]);

    return appInfo;
};

module.exports = {
    initContract,
    appCall,
    optInAsset,
    optInApp,
    buyAssets,
    buyAssetsInsuf
}