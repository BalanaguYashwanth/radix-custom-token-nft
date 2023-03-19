import {
    RadixDappToolkit,
    ManifestBuilder,
    Decimal,
    Bucket,
    Expression,
    ResourceAddress,
  } from '@radixdlt/radix-dapp-toolkit'
  const dAppId = 'account_tdx_b_1pryv0jqk6eqwfd90hwjjxgy6pmrwuwzp2tkqycp0flqqlgljf3'
  

  const rdt = RadixDappToolkit(
    { dAppDefinitionAddress: dAppId, dAppName: 'NFTMachine' },
    (requestData) => {
      requestData({
        accounts: { quantifier: 'atLeast', quantity: 1 },
      }).map(async ({ data: { accounts } }) => {
        // add accounts to dApp application state
        console.log("account data: ", accounts)
        accountAddress = accounts[0].address
        if(accountAddress){
          await getBalanaceFromAPI()
        }
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
  let sljgAddress = "resource_tdx_b_1qqc7x47xfwf9c65vgg88c3gc5dq052uc66h2ayv6k5ys36mvsj"
  let componentAddress="component_tdx_b_1q26a9g7vpy6qg4sw3xnst4zqejcyg9hdndcegwf6dcrssxwrxv" //: string  // GumballMachine component address
  let resourceAddress=sljgAddress //: string // GUM resource address
  // You can use this packageAddress to skip the dashboard publishing step package_tdx_b_1qxtzcuyh8jmcp9khn72k0gs4fp8gjqaz9a8jsmcwmh9qhax345
  let xrdAddress = "resource_tdx_b_1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8z96qp" 
    
  let NFT_IDs;
  
  //update the balance once purchase NFT purchase had done
  async function getBalanaceFromAPI(){
  async function api() {
    //  console.log(process.env.BETAURL); //check this important
    const data = await fetch("https://betanet.radixdlt.com/entity/fungibles", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address:
          accountAddress,
      }),
    });
    const { fungibles } = await data.json();
    return fungibles?.items || [];
  }
  
  const getBalanaces = (items) => {
    let XRD = 0,
      CustomToken = 0;
    for (let item of items) {
      if (item.amount.address === sljgAddress) {
        CustomToken = item.amount.value;
      }
      if (item.amount.address === xrdAddress) {
        XRD = item.amount.value;
      }
    }
    return { XRD, CustomToken };
  };
  const fungibleItems = await api() || []
  const {XRD, CustomToken}  = getBalanaces(fungibleItems)
  document.getElementById('xrd_balance').innerHTML = XRD;
  document.getElementById('slg_balance').innerHTML = CustomToken;
 }

 
  
  async function getNonfungiblesResources() {
    const data = await fetch(
      "https://betanet.radixdlt.com/entity/non-fungibles",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address:
          componentAddress,
        }),
      }
    );
    const { non_fungibles } = await data.json();
    const { items } = non_fungibles || [];
    
    NFT_IDs = items && items[0]?.address || "";
    return NFT_IDs || "";
  }


  
  const getListOfNFTIds = async (resourceAddress) => {
    const data = await fetch(
      "https://betanet.radixdlt.com/entity/non-fungible/ids",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address:
          componentAddress,
          resource_address: resourceAddress,
        }),
      }
    );
    const { non_fungible_ids } = await data.json();
    return non_fungible_ids?.items || []; 
  };

  const updateNFTStatus = (listOfNFTIds) => {
    for(const item of listOfNFTIds){
      document.getElementById(`buySpecialNFT ${item.non_fungible_id}`).innerText = 'BUY'
      document.getElementById(`buySpecialNFT ${item.non_fungible_id}`).onclick = buySpecialNFT
    }
  }

 
  const nftResourceAddress = await getNonfungiblesResources()
  const listOfNFTIds = await getListOfNFTIds(nftResourceAddress);
  updateNFTStatus(listOfNFTIds)
  // document.getElementById("list_nft_items").innerHTML  = convertNFTIdsToString(listOfNFTIds)


  document.getElementById('buy_popup_fungible_button').onclick = async function popup() {
      document.getElementById("form").style.display = "block";
  };


  document.getElementById('buy_fungibles_button').onclick = async function () {
    
    // const get_amount_of_xrd = parseInt(Math.trunc(document.getElementById("xrd_balance").textContent));
    const get_count_gumballs = document.getElementById("buy_fungible_input").value;
    const get_amount_of_xrd = get_count_gumballs * 2;
    let manifest = new ManifestBuilder()
      .withdrawFromAccountByAmount(accountAddress, get_amount_of_xrd, xrdAddress)
      .takeFromWorktopByAmount(get_amount_of_xrd, xrdAddress, "xrd_bucket")
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
    document.getElementById("form").style.display = "none";
    document.getElementById("buy_fungible_input").value = '';
    if(accountAddress){
      await getBalanaceFromAPI()
    }
    // Show the receipt on the DOM
    // document.getElementById('receipt').innerText = JSON.stringify(commitReceipt.details.receipt, null, 2);
    // resourceAddress = commitReceipt.details.receipt.state_updates.created_substates[1].substate_data.resource_amount.resource_address
   
    // document.getElementById("list_nft_items").innerHTML  = convertNFTIdsToString(listOfNFTIds)
  };


  async function buySpecialNFT(event) {
    const getNFTID = event.target.id.split(' ')[1]

    const count_tokens_buy_special_card = document.getElementById("slg_balance").textContent;
    // const localID_special_card = "#1#"
    let localID_special_card = document.getElementById("nftID").textContent;
    let manifest = new ManifestBuilder()
    .withdrawFromAccountByAmount(accountAddress, count_tokens_buy_special_card, resourceAddress)
    .takeFromWorktopByAmount(count_tokens_buy_special_card, resourceAddress, "sljg_bucket")
    .callMethod(componentAddress, "buy_special_card", [`NonFungibleLocalId("${getNFTID}")`,Bucket("sljg_bucket")])
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
  
    const nftResourceAddress = await getNonfungiblesResources()
    const listOfNFTIds = await getListOfNFTIds(nftResourceAddress);
    updateNFTStatus(listOfNFTIds)
    if(accountAddress){
      await getBalanaceFromAPI()
    }
    // Show the receipt on the DOM
    // document.getElementById('receiptNFT').innerText = JSON.stringify(commitReceipt.details.receipt, null, 2);
  };



