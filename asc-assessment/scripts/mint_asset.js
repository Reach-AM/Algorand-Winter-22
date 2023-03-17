const {executeTransaction, convert, readAppGlobalState} = require("@algo-builder/algob");
const {types} = require("@algo-builder/web");

async function run(runtimeEnv,deployer) {
    const master = deployer.accountsByName.get("master");
    const mintApprovalFile = "mint_approval.py";
    const mintClearStateFile = "mint_clearstate.py";
    const holdApprovalFile = "holdings_approval.py";
    const holdClearStateFile = "holdings_clearstate.py";
    const burnApprovalFile = "burn_approval.py";
    const burnClearStateFile = "burn_clearstate.py";

    // 1. Deploy the minting contract to create the TESLA coin.

    await deployer.deployApp(
        mintApprovalFile,
        mintClearStateFile,
        {
            sender: master,
            localInts: 0,
            localBytes: 0,
            globalInts: 1,
            globalBytes: 2,
        },
        { totalFee: 1000 }
    );

    const mintApp = deployer.getApp(mintApprovalFile, mintClearStateFile);
    const mintAddr = mintApp.applicationAccount;
    const mintID = mintApp.appID;

    // 2. Fund minting contract with algos to perform asset transfer.

    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: mintAddr,
        amountMicroAlgos: 1e6, // 1 Algo
        payFlags: { totalFee: 1000 }
    });

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: mintID,
        appArgs: [convert.stringToBytes("Mint")],
        payFlags: { totalFee: 1000 },
    });

    let assetID = (await readAppGlobalState(deployer, master.addr, mintID)).get("TeslaCoinID");
    deployer.addCheckpointKV("assetID", assetID);

    // 3. Deploy the holding contract with the asset ID and purchase price.
    
    await deployer.deployApp(
        holdApprovalFile,
        holdClearStateFile,
        {
            sender: master,
            localInts: 0,
            localBytes: 0,
            globalInts: 2,
            globalBytes: 0,
            foreignAssets: [assetID]
        },
        { totalFee: 1000 }
    );

    const holdingsApp = deployer.getApp(holdApprovalFile, holdClearStateFile);
    const holdingsAddr = holdingsApp.applicationAccount;

    deployer.addCheckpointKV("holdingsAppID", holdingsApp.appID);
    deployer.addCheckpointKV("holdingsAddr", holdingsAddr);

    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: holdingsAddr,
        amountMicroAlgos: 1e6,
        payFlags: { totalFee: 1000 },
    });

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: mintID,
        appArgs: [convert.stringToBytes("SetAccount"), convert.stringToBytes("Holdings")],
        accounts: [holdingsAddr],
        payFlags: { totalFee: 1000 },
    });

    // 4. Deploy the burn contract.

    await deployer.deployApp(
        burnApprovalFile,
        burnClearStateFile,
        {
            sender: master,
            localInts: 0,
            localBytes: 0,
            globalInts: 1,
            globalBytes: 0,
            foreignAssets: [assetID]
        },
        { totalFee: 1000 }
    );

    const burnApp = deployer.getApp(burnApprovalFile, burnClearStateFile);
    const burnAddr = burnApp.applicationAccount;

    await executeTransaction(deployer, {
        type: types.TransactionType.TransferAlgo,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        toAccountAddr: burnAddr,
        amountMicroAlgos: 1e6, // 1 Algo
        payFlags: { totalFee: 1000 },
    });

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: mintID,
        appArgs: [convert.stringToBytes("SetAccount"), convert.stringToBytes("Burn")],
        accounts: [burnAddr],
        payFlags: { totalFee: 1000 },
    });

    // 5. Perform asset opt in for holding and burn contracts.

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: holdingsApp.appID,
        appArgs: [convert.stringToBytes("AssetOptIn")],
        foreignAssets: [assetID],
        payFlags: { totalFee: 1000 },
    });

    await executeTransaction(deployer, {
        type: types.TransactionType.CallApp,
        sign: types.SignType.SecretKey,
        fromAccount: master,
        appID: burnApp.appID,
        appArgs: [convert.stringToBytes("AssetOptIn")],
        foreignAssets: [assetID],
        payFlags: { totalFee: 1000 }
    });

    // Log contracts info
    /*
    let mintAccount = await deployer.algodClient.accountInformation(mintAddr).do();
    console.log(mintAccount);

    let holdingsAccount = await deployer.algodClient.accountInformation(holdingsAddr).do();
    console.log(holdingsAccount);

    let burnAccount = await deployer.algodClient.accountInformation(burnAddr).do();
    console.log(burnAccount);
    */
}

module.exports = { default: run };
