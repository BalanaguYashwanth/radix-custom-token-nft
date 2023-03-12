import {
  RadixDappToolkit,
  ManifestBuilder,
  Decimal,
  Bucket,
  Expression,
  ResourceAddress,
  NonFungibleId
} from '@radixdlt/radix-dapp-toolkit'
const dAppId = 'account_tdx_b_1pryv0jqk6eqwfd90hwjjxgy6pmrwuwzp2tkqycp0flqqlgljf3'

const rdt = RadixDappToolkit(
  { dAppDefinitionAddress: dAppId, dAppName: 'NFTMachine' },
  (requestData) => {
    requestData({
      accounts: { quantifier: 'atLeast', quantity: 1 },
    }).map(({ data: { accounts } }) => {
      // add accounts to dApp application state
      console.log("account data: ", accounts)
      document.getElementById('accountName').innerText = accounts[0].label
      document.getElementById('accountAddress').innerText = accounts[0].address
      accountAddress = accounts[0].address
    })
  },
  { networkId: 11 }
)
console.log("dApp Toolkit: ", rdt)


// There are four classes exported in the Gateway-SDK These serve as a thin wrapper around the gateway API
// API docs are available @ https://betanet-gateway.redoc.ly/
import { TransactionApi, StateApi, StatusApi, StreamApi } from "@radixdlt/babylon-gateway-api-sdk";

// Instantiate Gateway SDK
const transactionApi = new TransactionApi();
const stateApi = new StateApi();
const statusApi = new StatusApi();
const streamApi = new StreamApi();

// Global states
let accountAddress //: string // User account address
let componentAddress //: string  // GumballMachine component address
let resourceAddress //: string // GUM resource address
// You can use this packageAddress to skip the dashboard publishing step package_tdx_b_1qxtzcuyh8jmcp9khn72k0gs4fp8gjqaz9a8jsmcwmh9qhax345
let xrdAddress = "resource_tdx_b_1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8z96qp" 

// ************ Instantiate component and fetch component and resource addresses *************
document.getElementById('instantiateComponent').onclick = async function () {
  let packageAddress = document.getElementById("packageAddress").value;
  const set_price = document.getElementById("set_price").value;

  let manifest = new ManifestBuilder()
    .callMethod(accountAddress, "create_proof", [ResourceAddress(xrdAddress)])
    .callFunction(packageAddress, "GumballMachine", "instantiate_gumball_machine", [Decimal(set_price)])
    .callMethod(accountAddress, "deposit_batch", [Expression("ENTIRE_WORKTOP")])
    .build()
    .toString();
  console.log("Instantiate Manifest: ", manifest)
  // Send manifest to extension for signing
  const result = await rdt
    .sendTransaction({
      transactionManifest: manifest,
      version: 1,
    })

  if (result.isErr()) throw result.error

  console.log("Intantiate WalletSDK Result: ", result.value)

  // ************ Fetch the transaction status from the Gateway API ************
  let status = await transactionApi.transactionStatus({
    transactionStatusRequest: {
      intent_hash_hex: result.value.transactionIntentHash
    }
  });
  console.log('Instantiate TransactionApi transaction/status:', status)

  // ************* fetch component address from gateway api and set componentAddress variable **************
  let commitReceipt = await transactionApi.transactionCommittedDetails({
    transactionCommittedDetailsRequest: {
      transaction_identifier: {
        type: 'intent_hash',
        value_hex: result.value.transactionIntentHash
      }
    }
  })
  console.log('Instantiate Committed Details Receipt', commitReceipt)

  // ****** set componentAddress and resourceAddress variables with gateway api commitReciept payload ******
  // componentAddress = commitReceipt.details.receipt.state_updates.new_global_entities[0].global_address <- long way -- shorter way below ->
  componentAddress = commitReceipt.details.referenced_global_entities[0]
  document.getElementById('componentAddress').innerText = componentAddress;

  

  resourceAddress = commitReceipt.details.referenced_global_entities[1]
  document.getElementById('gumAddress').innerText = resourceAddress;

  console.log('componentAddress---', componentAddress,resourceAddress)
}

document.getElementById('buyGumball').onclick = async function () {

  const get_amount_of_xrd = document.getElementById("purchase").value;
  const get_count_gumballs = document.getElementById("count_gumballs").value;

  let manifest = new ManifestBuilder()
    .withdrawFromAccountByAmount(accountAddress, get_amount_of_xrd,xrdAddress)
    .takeFromWorktopByAmount(get_amount_of_xrd,xrdAddress, "xrd_bucket")
    .callMethod(componentAddress, "buy_gumball", [Decimal(get_count_gumballs),Bucket("xrd_bucket")])
    .callMethod(accountAddress, "deposit_batch", [Expression("ENTIRE_WORKTOP")])
    .build()
    .toString();

  console.log('buy Gumball manifest: ', manifest)

  // Send manifest to extension for signing
  const result = await rdt
    .sendTransaction({
      transactionManifest: manifest,
      version: 1,
    })

  if (result.isErr()) throw result.error

  console.log("buyGumball getMethods Result: ", result)

  // Fetch the transaction status from the Gateway SDK
  let status = await transactionApi.transactionStatus({
    transactionStatusRequest: {
      intent_hash_hex: result.value.transactionIntentHash
    }
  });
  console.log('buyGumball TransactionAPI transaction/status: ', status)

  // fetch commit reciept from gateway api 
  let commitReceipt = await transactionApi.transactionCommittedDetails({
    transactionCommittedDetailsRequest: {
      transaction_identifier: {
        type: 'intent_hash',
        value_hex: result.value.transactionIntentHash
      }
    }
  })
  console.log('buyGumball Committed Details Receipt', commitReceipt)

  resourceAddress = commitReceipt.details.receipt.state_updates.created_substates[1].substate_data.resource_amount.resource_address
  // Show the receipt on the DOM
  document.getElementById('receipt').innerText = JSON.stringify(commitReceipt.details.receipt, null, 2);
};

document.getElementById("burnGumball").onclick = async function(){

  const count_burn_gumballs = document.getElementById("burn_gumballs").value;
  let manifest = new ManifestBuilder()
  // .callMethod(accountAddress, "create_proof", [ResourceAddress(resourceAddress)])
  .withdrawFromAccountByAmount(accountAddress, count_burn_gumballs, resourceAddress)
  .takeFromWorktopByAmount(count_burn_gumballs, resourceAddress, "sljg_bucket")
  .callMethod(componentAddress, "destroy_tokens", [Bucket("sljg_bucket")])
  .callMethod(accountAddress, "deposit_batch", [Expression("ENTIRE_WORKTOP")])
  .build()
  .toString();
  console.log('buy_random_card manifest: ', manifest)

  const result = await rdt
  .sendTransaction({
    transactionManifest: manifest,
    version: 1,
  })

if (result.isErr()) throw result.error

let status = await transactionApi.transactionStatus({
  transactionStatusRequest: {
    intent_hash_hex: result.value.transactionIntentHash
  }
});
console.log('Buy NFT TransactionAPI transaction/status: ', status)

// fetch commit reciept from gateway api 
let commitReceipt = await transactionApi.transactionCommittedDetails({
  transactionCommittedDetailsRequest: {
    transaction_identifier: {
      type: 'intent_hash',
      value_hex: result.value.transactionIntentHash
    }
  }
})
console.log('Buy Gumball Committed Details Receipt', commitReceipt)

console.log("Buy NFT getMethods Result: ", result)
}

document.getElementById('instantiateComponentNFT').onclick = async function () {
  let packageAddress = document.getElementById("packageAddressNFT").value;

  let manifest = new ManifestBuilder()
    .callMethod(accountAddress, "create_proof", [ResourceAddress(resourceAddress)])
    .callFunction(packageAddress, "HelloNft", "instantiate_component", [ResourceAddress(resourceAddress)])
    .build()
    .toString();
  console.log("Instantiate Manifest: ", manifest)
  // Send manifest to extension for signing
  const result = await rdt
    .sendTransaction({
      transactionManifest: manifest,
      version: 1,
    })

  if (result.isErr()) throw result.error

  console.log("Intantiate WalletSDK Result: ", result.value)

  // ************ Fetch the transaction status from the Gateway API ************
  let status = await transactionApi.transactionStatus({
    transactionStatusRequest: {
      intent_hash_hex: result.value.transactionIntentHash
    }
  });
  console.log('Instantiate TransactionApi transaction/status:', status)

  // ************* fetch component address from gateway api and set componentAddress variable **************
  let commitReceipt = await transactionApi.transactionCommittedDetails({
    transactionCommittedDetailsRequest: {
      transaction_identifier: {
        type: 'intent_hash',
        value_hex: result.value.transactionIntentHash
      }
    }
  })
  console.log('Instantiate Committed Details Receipt', commitReceipt)

  // ****** set componentAddress and resourceAddress variables with gateway api commitReciept payload ******
  // componentAddress = commitReceipt.details.receipt.state_updates.new_global_entities[0].global_address <- long way -- shorter way below ->
  componentAddress = commitReceipt.details.referenced_global_entities[0]
  document.getElementById('componentAddressNFT').innerText = componentAddress;

  

  const resourceAddressNFT = commitReceipt.details.referenced_global_entities[1]
  document.getElementById('gumAddressNFT').innerText = resourceAddressNFT;

  console.log('componentAddressNFT---', componentAddress,resourceAddress)
}

document.getElementById('buyGumballNFT').onclick = async function () {

  let manifest = new ManifestBuilder()
    .withdrawFromAccountByAmount(accountAddress, 1, resourceAddress)
    .takeFromWorktopByAmount(1, resourceAddress, "sljg_bucket")
    .callMethod(componentAddress, "buy_random_card", [Bucket("sljg_bucket")])
    .callMethod(accountAddress, "deposit_batch", [Expression("ENTIRE_WORKTOP")])
    .build()
    .toString();

  console.log('buy_random_card manifest: ', manifest)

  // Send manifest to extension for signing
  const result = await rdt
    .sendTransaction({
      transactionManifest: manifest,
      version: 1,
    })

  if (result.isErr()) throw result.error

  console.log("Buy NFT getMethods Result: ", result)

  // Fetch the transaction status from the Gateway SDK
  let status = await transactionApi.transactionStatus({
    transactionStatusRequest: {
      intent_hash_hex: result.value.transactionIntentHash
    }
  });
  console.log('Buy NFT TransactionAPI transaction/status: ', status)

  // fetch commit reciept from gateway api 
  let commitReceipt = await transactionApi.transactionCommittedDetails({
    transactionCommittedDetailsRequest: {
      transaction_identifier: {
        type: 'intent_hash',
        value_hex: result.value.transactionIntentHash
      }
    }
  })
  console.log('Buy Gumball Committed Details Receipt', commitReceipt)

  // Show the receipt on the DOM
  document.getElementById('receiptNFT').innerText = JSON.stringify(commitReceipt.details.receipt, null, 2);
};

document.getElementById('buySpecialNFT').onclick = async function () {

  const count_tokens_buy_special_card = document.getElementById("count_tokens_buy_special_card").value;
  const localID_special_card = document.getElementById("localID_special_card").value;
  

  let manifest = new ManifestBuilder()
    .withdrawFromAccountByAmount(accountAddress, count_tokens_buy_special_card, resourceAddress) 
    .takeFromWorktopByAmount(count_tokens_buy_special_card, resourceAddress, "sljg_bucket")
    .callMethod(componentAddress, "buy_special_card", [localID_special_card,Bucket("sljg_bucket")])
    .callMethod(accountAddress, "deposit_batch", [Expression("ENTIRE_WORKTOP")])
    .build()
    .toString();
  
  console.log('buy_special_card manifest: ', manifest)

  // Send manifest to extension for signing
  const result = await rdt
    .sendTransaction({
      transactionManifest: manifest,
      version: 1,
    })

  if (result.isErr()) throw result.error

  console.log("Buy NFT getMethods Result: ", result)

  // Fetch the transaction status from the Gateway SDK
  let status = await transactionApi.transactionStatus({
    transactionStatusRequest: {
      intent_hash_hex: result.value.transactionIntentHash
    }
  });
  console.log('Buy NFT TransactionAPI transaction/status: ', status)

  // fetch commit reciept from gateway api 
  let commitReceipt = await transactionApi.transactionCommittedDetails({
    transactionCommittedDetailsRequest: {
      transaction_identifier: {
        type: 'intent_hash',
        value_hex: result.value.transactionIntentHash
      }
    }
  })
  console.log('Buy Gumball Committed Details Receipt', commitReceipt)

  // Show the receipt on the DOM
  document.getElementById('receiptSpecialNFT').innerText = JSON.stringify(commitReceipt.details.receipt, null, 2);
};
