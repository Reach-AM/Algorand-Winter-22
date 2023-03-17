const { Runtime, AccountStore, ERRORS } = require("@algo-builder/runtime");
const { assert } = require("chai");
const { convert } = require("@algo-builder/algob");
const algosdk = require("algosdk");
const commonfn = require("./common/commonfn");

const mintApprovalFile = "mint_approval.py";
const mintClearStateFile = "mint_clearstate.py";
const holdApprovalFile = "holdings_approval.py";
const holdClearStateFile = "holdings_clearstate.py";
const burnApprovalFile = "burn_approval.py";    
const burnClearStateFile = "burn_clearstate.py";

describe("Success Flow", function () {
    let master;
    let acc;
    let runtime;

    /* ================================= */
    /* ========== TESTS SET UP ========= */
    /* ================================= */

    this.beforeEach(async function () {
        master = new AccountStore(1000e6);
        acc = new AccountStore(1000e6);
        runtime = new Runtime([master, acc]);
    });

    const initMintContract = () => {
        return commonfn.initContract(
            runtime, master.account,
            mintApprovalFile, mintClearStateFile,
            [],
            1, 2
        );
    };

    const initHoldContract = (assetID) => {
        return commonfn.initContract(
            runtime, master.account,
            holdApprovalFile, holdClearStateFile,
            [assetID],
            2
        );
    };

    const initBurnContract = (assetID) => {
        return commonfn.initContract(
            runtime, master.account,
            burnApprovalFile, burnClearStateFile,
            [assetID],
            1
        );
    }; 

    const getGlobal = (appID, key) => runtime.getGlobalState(appID, key);

    /* ================================= */
    /* ========== BEGIN TESTS ========== */
    /* ================================= */
    
    /* ================================= */
    /* ====== MINT CONTRACT TESTS ====== */
    /* ================================= */

    it("Deploy mint contract successfully", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID = mintAppInfo.appID;

        // Verify app created
        assert.isDefined(mintAppID);
        assert.equal(getGlobal(mintAppID, "TeslaCoinID"), 0); // integer check
        assert.equal(getGlobal(mintAppID, "HoldingsAddr"), "");
        assert.equal(getGlobal(mintAppID, "BurnAddr"), "");

        // Verify app funded
        const mintAccount = runtime.getAccount(mintAppInfo.applicationAccount);
        assert.equal(mintAccount.amount, 10e6);
    });
    
    it("Deploy ASA successfully", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID = mintAppInfo.appID;

        // App Call to deploy Tesla Coin
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Mint")]
        );
        const assetID = Number(getGlobal(mintAppID, "TeslaCoinID"));

        // Verify Asset ID is not 0
        assert.notEqual(getGlobal(mintAppID, "TeslaCoinID"), 0);

        // Verify asset is on Mint contract Assets
        const mintAccount = runtime.getAccount(mintAppInfo.applicationAccount);
        holdAppAssets = [...mintAccount.assets][0][1];
        assert.equal(holdAppAssets['asset-id'], assetID);
        assert.equal(holdAppAssets['amount'], 1000000);
    });

    /* ================================= */
    /* ====== HOLD CONTRACT TESTS ====== */
    /* ================================= */
    
    it("Deploy holdings contract successfully", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID = mintAppInfo.appID;

        // App Call to deploy Tesla Coin
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Mint")]
        );
        const assetID = Number(getGlobal(mintAppID, "TeslaCoinID"));

        // Deploy Holdings Contract
        const holdAppInfo = initHoldContract(assetID);
        const holdAppID = holdAppInfo.appID;

        // Verify app created
        assert.isDefined(holdAppID);
        assert.equal(getGlobal(holdAppID, "Price"), 5000000); // integer check

        // Verify app funded
        const appAccount = runtime.getAccount(holdAppInfo.applicationAccount);
        assert.equal(appAccount.amount, 10e6);
    });

    it("Holdings contract address stored in Mint contract successfully", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID =  mintAppInfo.appID;

        // App Call to deploy Tesla Coin
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Mint")]
        );

        const assetID = Number(getGlobal(mintAppID, "TeslaCoinID"));

        // Deploy Holdings Contract
        const holdAppInfo = initHoldContract(assetID);
        const holdAddr = holdAppInfo.applicationAccount;

        // App Call to store Account
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("SetAccount"), convert.stringToBytes("Holdings")],
            [holdAddr]
        );

        // Verify Holdings Addr is on Mint
        const globalAddress = algosdk.encodeAddress(Buffer.from(getGlobal(mintAppID, "HoldingsAddr"), "base64"));
        assert.equal(globalAddress, holdAddr);
    });

    it("Holdings contract asset opt in succesfully", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID =  mintAppInfo.appID;

        // App Call to deploy Tesla Coin
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Mint")]
        );
        const assetID = Number(getGlobal(mintAppID, "TeslaCoinID"));

        // Deploy Holdings Contract
        const holdAppInfo = initHoldContract(assetID);
        const holdAddr = holdAppInfo.applicationAccount;
        const holdAppID = holdAppInfo.appID;

        // App Call to opt into asset
        commonfn.appCall(
            runtime, master.account,
            holdAppID,
            [convert.stringToBytes("AssetOptIn")],
            [holdAddr],[assetID]
        );

        // Verify asset is on Holdings contract Assets
        const holdAccount = runtime.getAccount(holdAppInfo.applicationAccount);
        holdAppAssets = [...holdAccount.assets][0][1];
        assert.equal(holdAppAssets['asset-id'], assetID);
        assert.equal(holdAppAssets['amount'], 0);
    });

    it("Transfer to Holdings contract succesfully", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID =  mintAppInfo.appID;

        // App Call to deploy Tesla Coin
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Mint")]
        );
        const assetID = Number(getGlobal(mintAppID, "TeslaCoinID"));

        // Deploy Holdings Contract
        const holdAppInfo = initHoldContract(assetID);
        const holdAddr = holdAppInfo.applicationAccount;
        const holdAppID = holdAppInfo.appID;

        // App Call to store Account
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("SetAccount"), convert.stringToBytes("Holdings")],
            [holdAddr]
        );

        // App Call to opt into asset
        commonfn.appCall(
            runtime, master.account,
            holdAppID,
            [convert.stringToBytes("AssetOptIn")],
            [holdAddr],[assetID]
        );

        // App Call to transfer assets
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Transfer"), convert.uint64ToBigEndian(1000)],
            [holdAddr],[assetID]
        );

        // Verify ammount substracted from Mint contract Assets
        const mintAccount = runtime.getAccount(mintAppInfo.applicationAccount);
        holdAppAssets = [...mintAccount.assets][0][1];
        assert.equal(holdAppAssets['asset-id'], assetID);
        assert.equal(holdAppAssets['amount'], 999000);

        // Verify ammount in Holdings contract Assets
        const holdAccount = runtime.getAccount(holdAppInfo.applicationAccount);
        holdAppAssets = [...holdAccount.assets][0][1];
        assert.equal(holdAppAssets['asset-id'], assetID);
        assert.equal(holdAppAssets['amount'], 1000);
    });

    it("Change tokens price in Holdings contract", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID =  mintAppInfo.appID;

        // App Call to deploy Tesla Coin
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Mint")]
        );
        const assetID = Number(getGlobal(mintAppID, "TeslaCoinID"));

        // Deploy Holdings Contract
        const holdAppInfo = initHoldContract(assetID);
        const holdAppID = holdAppInfo.appID;

        // App Call to change price
        commonfn.appCall(
            runtime, master.account,
            holdAppID,
            [convert.stringToBytes("UpdatePrice"), convert.uint64ToBigEndian(6e6)],
        );

        // Verify app created
        assert.isDefined(holdAppID);
        assert.equal(getGlobal(holdAppID, "Price"), 6000000); // integer check
    });

    /* ================================= */
    /* ====== BURN CONTRACT TESTS ====== */
    /* ================================= */
    
    it("Deploy burn contract successfully", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID =  mintAppInfo.appID;

        // App Call to deploy Tesla Coin
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Mint")]
        );
        const assetID = Number(getGlobal(mintAppID, "TeslaCoinID"));

        // Deploy Holdings Contract
        const burnAppInfo = initBurnContract(assetID);
        const burnAppID = burnAppInfo.appID;

        // Verify app created
        assert.isDefined(burnAppID);

        // Verify app funded
        const burnAccount = runtime.getAccount(burnAppInfo.applicationAccount);
        assert.equal(burnAccount.amount, 10e6);
    });

    it("Burn contract address stored in Mint contract successfully", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID =  mintAppInfo.appID;

        // App Call to deploy Tesla Coin
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Mint")]
        );

        const assetID = Number(getGlobal(mintAppID, "TeslaCoinID"));

        // Deploy Burn Contract
        const burnAppInfo = initBurnContract(assetID);
        const burnAddr = burnAppInfo.applicationAccount;

        // App Call to store Account
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("SetAccount"), convert.stringToBytes("Burn")],
            [burnAddr]
        );

        // Verify Burn Addr is on Mint
        const globalAddress = algosdk.encodeAddress(Buffer.from(getGlobal(mintAppID, "BurnAddr"), "base64"));
        assert.equal(globalAddress, burnAddr);
    });

    it("Burn contract asset opt in succesfully", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID =  mintAppInfo.appID;

        // App Call to deploy Tesla Coin
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Mint")]
        );
        const assetID = Number(getGlobal(mintAppID, "TeslaCoinID"));

        // Deploy Burn Contract
        const burnAppInfo = initBurnContract(assetID);
        const burnAddr = burnAppInfo.applicationAccount;
        const burnAppID = burnAppInfo.appID;

        // App Call to opt into asset
        commonfn.appCall(
            runtime, master.account,
            burnAppID,
            [convert.stringToBytes("AssetOptIn")],
            [burnAddr],[assetID]
        );

        // Verify asset is on Burn contract Assets
        const burnAccount = runtime.getAccount(burnAddr);
        burnAppAssets = [...burnAccount.assets][0][1];
        assert.equal(burnAppAssets['asset-id'], assetID);
        assert.equal(burnAppAssets['amount'], 0);
    });

    it("Burn assets succesfully", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID =  mintAppInfo.appID;

        // App Call to deploy Tesla Coin
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Mint")]
        );
        const assetID = Number(getGlobal(mintAppID, "TeslaCoinID"));

        // Deploy Burn Contract
        const burnAppInfo = initBurnContract(assetID);
        const burnAddr = burnAppInfo.applicationAccount;
        const burnAppID = burnAppInfo.appID;

        // App Call to store Account
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("SetAccount"), convert.stringToBytes("Burn")],
            [burnAddr]
        );

        // App Call to opt into asset
        commonfn.appCall(
            runtime, master.account,
            burnAppID,
            [convert.stringToBytes("AssetOptIn")],
            [burnAddr],[assetID]
        );

        // App Call to burn assets
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Burn"), convert.uint64ToBigEndian(1000)],
            [burnAddr],[assetID]
        );

        // Verify ammount substracted from Mint contract Assets
        const mintAccount = runtime.getAccount(mintAppInfo.applicationAccount);
        burnAppAssets = [...mintAccount.assets][0][1];
        assert.equal(burnAppAssets['asset-id'], assetID);
        assert.equal(burnAppAssets['amount'], 999000);

        // Verify ammount in Burn contract Assets
        const burnAccount = runtime.getAccount(burnAddr);
        burnAppAssets = [...burnAccount.assets][0][1];
        assert.equal(burnAppAssets['asset-id'], assetID);
        assert.equal(burnAppAssets['amount'], 1000);
    });

    /* ================================= */
    /* =========== USER TESTS ========== */
    /* ================================= */

    it("User opt into Asset", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID =  mintAppInfo.appID;

        // App Call to deploy Tesla Coin
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Mint")]
        );
        const assetID = Number(getGlobal(mintAppID, "TeslaCoinID"));

        // Opt into asset
        commonfn.optInAsset(runtime, acc.account, assetID);

        // Verify Asset in acc assets
        const accAccount = runtime.getAccount(acc.account.addr);
        accAssets = [...accAccount.assets][0][1];
        assert.equal(accAssets['asset-id'], assetID);
        assert.equal(accAssets['amount'], 0);
    });

    it("User buy assets from Holdings", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID =  mintAppInfo.appID;

        // App Call to deploy Tesla Coin
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Mint")]
        );
        const assetID = Number(getGlobal(mintAppID, "TeslaCoinID"));

        // Deploy Holdings Contract
        const holdAppInfo = initHoldContract(assetID );
        const holdAddr = holdAppInfo.applicationAccount;
        const holdAppID = holdAppInfo.appID;

        // App Call to store Account
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("SetAccount"), convert.stringToBytes("Holdings")],
            [holdAddr]
        );

        // App Call for Holdings to opt into asset
        commonfn.appCall(
            runtime, master.account,
            holdAppID,
            [convert.stringToBytes("AssetOptIn")],
            [holdAddr],[assetID]
        );

        // App Call to transfer assets to Holdings
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Transfer"), convert.uint64ToBigEndian(1000)],
            [holdAddr],[assetID]
        );

        // User opt into asset
        commonfn.optInAsset(runtime, acc.account, assetID);

        // App Call to sell Tokens & Payment
        commonfn.buyAssets(
            runtime, acc.account,
            holdAppInfo,
            [assetID], 23
        );

        // Verify Assets in acc assets
        const accAccount = runtime.getAccount(acc.account.addr);
        accAssets = [...accAccount.assets][0][1];
        assert.equal(accAssets['amount'], 23);
    });
});