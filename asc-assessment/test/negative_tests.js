const { Runtime, AccountStore, ERRORS } = require("@algo-builder/runtime");
const { assert, expect } = require("chai");
const algosdk = require("algosdk");
const commonfn = require("./common/commonfn");
const { convert } = require("@algo-builder/algob");
//const { types } = require("@algo-builder/web");

const mintApprovalFile = "mint_approval.py";
const mintClearStateFile = "mint_clearstate.py";
const holdApprovalFile = "holdings_approval.py";
const holdClearStateFile = "holdings_clearstate.py";
const burnApprovalFile = "burn_approval.py";    
const burnClearStateFile = "burn_clearstate.py";

// Errors
const RUNTIME_ERR1009 = 'RUNTIME_ERR1009: TEAL runtime encountered err opcode'; // rejected by logic

describe("Negative Tests", function () {
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
    
    it("Double asset creation fails", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID = mintAppInfo.appID;

        // App Call to deploy Tesla Coin
        commonfn.appCall(
            runtime, master.account,
            mintAppID,
            [convert.stringToBytes("Mint")]
        );

        // Deploy Tesla Coin again
        assert.throws(() => {
            commonfn.appCall(
                runtime, master.account,
                mintAppID,
                [convert.stringToBytes("Mint")]
            )
        }, RUNTIME_ERR1009);
    });

    it("Asset creation fails when non-creator calls", () => {
        // Deploy Mint Contract
        const mintAppInfo = initMintContract();
        const mintAppID = mintAppInfo.appID;

        // Deploy Tesla Coin with acc
        assert.throws(() => {
            commonfn.appCall(
                runtime, acc.account,
                mintAppID,
                [convert.stringToBytes("Mint")]
            )
        }, RUNTIME_ERR1009);
    });

    it("Asset transfer fails when supply is insufficient", () => {
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

        // App Call to transfer assets > supply
        assert.throws(() => {
            commonfn.appCall(
                runtime, master.account,
                mintAppID,
                [convert.stringToBytes("Transfer"), convert.uint64ToBigEndian(1000001)],
                [holdAddr],[assetID]
            )
        }, RUNTIME_ERR1009);
    });

    it("Asset burn fails when supply is insufficient", () => {
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

        // App Call to burn assets > supply
        assert.throws(() => {
            commonfn.appCall(
                runtime, master.account,
                mintAppID,
                [convert.stringToBytes("Burn"), convert.uint64ToBigEndian(1000001)],
                [burnAddr],[assetID]
            )
        }, RUNTIME_ERR1009);
    });

    it("Asset transfer fails when non-creator calls", () => {
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

        // App Call to transfer assets > supply
        assert.throws(() => {
            commonfn.appCall(
                runtime, acc.account,
                mintAppID,
                [convert.stringToBytes("Transfer"), convert.uint64ToBigEndian(1000)],
                [holdAddr],[assetID]
            )
        }, RUNTIME_ERR1009);
    });

    it("Asset burn fails when non-creator calls", () => {
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

        // App Call to burn assets > supply
        assert.throws(() => {
            commonfn.appCall(
                runtime, acc.account,
                mintAppID,
                [convert.stringToBytes("Burn"), convert.uint64ToBigEndian(1000)],
                [burnAddr],[assetID]
            )
        }, RUNTIME_ERR1009);
    });

    it("Updating price of asset fails when not called by creator", () => {
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

        // App Call to change price by non-creator acc
        assert.throws(() => {
            commonfn.appCall(
                runtime, acc.account,
                holdAppID,
                [convert.stringToBytes("UpdatePrice"), convert.uint64ToBigEndian(6e6)],
            )
        }, RUNTIME_ERR1009);
    });

    it("Selling token fails when supply < amount sold", () => {
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
            [convert.stringToBytes("Transfer"), convert.uint64ToBigEndian(10)],
            [holdAddr],[assetID]
        );

        // User opt into asset
        commonfn.optInAsset(runtime, acc.account, assetID);

        // App Call to sell Tokens & Payment > supply
        assert.throws(() => {
            commonfn.buyAssets(
                runtime, acc.account,
                holdAppInfo,
                [assetID], 23
            )
        }, RUNTIME_ERR1009);
    });

    it("Selling tokens fails when transaction is not grouped", () => {
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

        // App Call to sell Tokens NOT gropued with payment
        assert.throws(() => {
            commonfn.appCall(
                runtime, master.account,
                holdAppID,
                [convert.stringToBytes("SellTokens"), convert.uint64ToBigEndian(10)],
                [],[assetID]
            );
        }, RUNTIME_ERR1009);
    });

    it("Buying 0 token fails", () => {
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

        // App Call to sell Tokens & Payment > supply
        assert.throws(() => {
            commonfn.buyAssets(
                runtime, acc.account,
                holdAppInfo,
                [assetID], 0
            )
        }, RUNTIME_ERR1009);
    });

    it("Buying tokens with insufficient algos", () => {
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

        // App Call to sell Tokens & Payment > supply
        assert.throws(() => {
            commonfn.buyAssetsInsuf(
                runtime, acc.account,
                holdAppInfo,
                [assetID], 10
            )
        }, RUNTIME_ERR1009);
    });

    it("Transfer token to non holding app fails", () => {
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

        // App Call to transfer assets to not Holdings Acc
        assert.throws(() => {
            commonfn.appCall(
                runtime, master.account,
                mintAppID,
                [convert.stringToBytes("Transfer"), convert.uint64ToBigEndian(1000)],
                [acc.account.addr],[assetID]
            )
        }, RUNTIME_ERR1009);
    });

    it("Burn token to non burn app fails", () => {
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

        // App Call to burn assets > supply
        assert.throws(() => {
            commonfn.appCall(
                runtime, master.account,
                mintAppID,
                [convert.stringToBytes("Burn"), convert.uint64ToBigEndian(1000)],
                [acc.account.addr],[assetID]
            )
        }, RUNTIME_ERR1009);
    });

});
