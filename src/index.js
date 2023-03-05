import {
  RadixDappToolkit,
  ManifestBuilder,
  Decimal,
  Bucket,
  Expression,
  ResourceAddress
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

  let manifest = new ManifestBuilder()
    .callMethod(accountAddress, "create_proof", [ResourceAddress("resource_tdx_b_1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8z96qp")])
    .callFunction(packageAddress, "GumballMachine", "instantiate_gumball_machine", [Decimal("200")])
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

  let manifest = new ManifestBuilder()
    .withdrawFromAccountByAmount(accountAddress, 400, "resource_tdx_b_1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8z96qp")
    .takeFromWorktopByAmount(400, "resource_tdx_b_1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8z96qp", "xrd_bucket")
    .callMethod(componentAddress, "buy_gumball", [Bucket("xrd_bucket")])
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

  // Show the receipt on the DOM
  document.getElementById('receipt').innerText = JSON.stringify(commitReceipt.details.receipt, null, 2);
};


document.getElementById('instantiateComponentNFT').onclick = async function () {
  let packageAddress = document.getElementById("packageAddressNFT").value;

  let manifest = new ManifestBuilder()
    .callMethod(accountAddress, "create_proof", [ResourceAddress("resource_tdx_b_1qzurv2rh6kyze3d3yhcpphdamme9nfkm6hj963lv4l2qc6hu3w")])
    .callFunction(packageAddress, "HelloNft", "instantiate_component", [ResourceAddress("resource_tdx_b_1qzurv2rh6kyze3d3yhcpphdamme9nfkm6hj963lv4l2qc6hu3w")])
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

  

  resourceAddress = commitReceipt.details.referenced_global_entities[1]
  document.getElementById('gumAddressNFT').innerText = resourceAddress;

  console.log('componentAddressNFT---', componentAddress,resourceAddress)
}

document.getElementById('buyGumballNFT').onclick = async function () {

  let manifest = new ManifestBuilder()
    .withdrawFromAccountByAmount(accountAddress, 1, "resource_tdx_b_1qzurv2rh6kyze3d3yhcpphdamme9nfkm6hj963lv4l2qc6hu3w")
    .takeFromWorktopByAmount(1, "resource_tdx_b_1qzurv2rh6kyze3d3yhcpphdamme9nfkm6hj963lv4l2qc6hu3w", "sljg_bucket")
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

  let manifest = new ManifestBuilder()
    .withdrawFromAccountByAmount(accountAddress, 5, "resource_tdx_b_1qzurv2rh6kyze3d3yhcpphdamme9nfkm6hj963lv4l2qc6hu3w")
    .takeFromWorktopByAmount(5, "resource_tdx_b_1qzurv2rh6kyze3d3yhcpphdamme9nfkm6hj963lv4l2qc6hu3w", "sljg_bucket")
    .callMethod(componentAddress, "buy_special_card", [2,Bucket("sljg_bucket")])
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
