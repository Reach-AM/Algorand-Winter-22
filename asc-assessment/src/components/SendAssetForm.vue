<template>
    <div id="buyasset" class="mb-5">
        <h3>Buy TESLA coin</h3>
        <p>You can only mint up to 1000 TESLA coins</p>
        <div
            v-if="this.acsTxId !== ''"
            class="alert alert-success"
            role="alert"
        >
            Txn Ref:
            <a :href="explorerURL" target="_blank">{{ this.acsTxId }}</a>
        </div>
        <p>TESLA coins left: {{ this.asset_left }}</p>
        <form
            action="#"
            @submit.prevent="handleBuyAsset"
        >
            <div class="mb-3">
                <label for="asset_amount" class="form-label"
                    >Buy amount</label
                >
                <input
                    type="number"
                    class="form-control"
                    id="asset_amount"
                    v-model="asset_amount"
                />
            </div>
            <p><i>*If it's the first time you buy the app might prompt you to opt into the asset and the app first.*</i></p>
            <button type="submit" class="btn btn-primary">Buy</button>
        </form>
        
    </div>
</template>

<script>
import * as helpers from '../helpers.js';
import contracts from "../artifacts/mint_asset.js.cp.yaml";

export default {
    props: {
        connection: String,
        network: String,
        sender: String
    },
    data() {
        return {
            acsTxId: "",
            asset_left: 0,
            asset_amount: 0,
            explorerURL: "",
            metadata: contracts.default.metadata,
            holdingsID: contracts.default.metadata.holdingsAppID,
            holdingsAddr: contracts.default.metadata.holdingsAddress,
            assetID: contracts.default.metadata.assetID
        };
    },
    methods: {
        async updateTxn(value) {
            this.acsTxId = value;
            this.explorerURL = helpers.getExplorerURL(this.acsTxId, this.network);
        },

        async handleBuyAsset() {
            await this.setAmountLeft();
            let response = await helpers.buyAsset(
                this.sender,
                this.holdingsID,
                this.holdingsAddr, 
                this.assetID,
                this.asset_amount,
                this.network
            );
            if(response != undefined) {
                await this.updateTxn(response.txId);
            }
        },
        async setAmountLeft() {
            this.asset_left = await helpers.getAmountLeft(
                this.holdingsAddr,
                this.assetID,
                this.network
            );
        }
    },
    async mounted() {
        await this.setAmountLeft();
    }
};
</script>
