use scrypto::prelude::*;

#[derive(ScryptoCategorize, ScryptoEncode, ScryptoDecode, LegacyDescribe)]
pub enum Color {
    White,
    Blue,
    Black,
    Red,
    Green,
}

#[derive(ScryptoCategorize, ScryptoEncode, ScryptoDecode, LegacyDescribe)]
pub enum Rarity {
    Common,
    Uncommon,
    Rare,
    MythicRare,
}

#[derive(NonFungibleData)]
pub struct MagicCard {
    color: Color,
    rarity: Rarity,
    #[mutable]
    level: u8,
}


#[blueprint]
mod gumball_machine {
    struct GumballMachine {
        gumballs: Vault,
        collected_xrd: Vault,
        price: Decimal,
    }

    impl GumballMachine {
        // given a price in XRD, creates a ready-to-use gumball machine
        pub fn instantiate_gumball_machine(price: Decimal) -> ComponentAddress {
            // create a new Gumball resource, with a fixed quantity of 100
            let bucket_of_gumballs = ResourceBuilder::new_fungible()
                .divisibility(DIVISIBILITY_NONE)
                .metadata("name", "SriLankaJungler")
                .metadata("shortname","Jungler")
                .metadata("symbol", "SLJG")
                .metadata("description", "A precious coin")
                // .mintable(rule!(require(owner-badge)),LOCKED)
                .mint_initial_supply(10000);

            // populate a GumballMachine struct and instantiate a new component
            Self {
                gumballs: Vault::with_bucket(bucket_of_gumballs),
                collected_xrd: Vault::new(RADIX_TOKEN),
                price: price,
            }
            .instantiate()
            .globalize()
        }

        pub fn get_price(&self) -> Decimal {
            self.price
        }

        // pub fn show_tokens(&self) -> Vault {
        //     self.gumballs.clone()
        // }
            //gumball_tokens:Decimal,
        pub fn buy_gumball(&mut self, mut payment: Bucket) -> (Bucket, Bucket) {
            // take our price in XRD out of the payment
            // if the caller has sent too few, or sent something other than XRD, they'll get a runtime error
            // if gumball_tokens * 200 <= self.price {
                let our_share = payment.take(self.price);
                self.collected_xrd.put(our_share);

                // we could have simplified the above into a single line, like so:
                // self.collected_xrd.put(payment.take(self.price));

                // return a tuple containing a gumball, plus whatever change is left on the input payment (if any)
                // if we're out of gumballs to give, we'll see a runtime error when we try to grab one
                (self.gumballs.take(2), payment)
            // }
            // else{
            //     panic!("Please send required coins");
            // }

        }
    }
}

#[blueprint]
mod hello_nft {
    struct HelloNft {
        /// A vault that holds all our special cards
        special_cards: Vault,
        /// The price for each special card
        special_card_prices: HashMap<NonFungibleLocalId, Decimal>,
        /// A vault that holds the mint badge
        random_card_mint_badge: Vault,
        /// The resource address of all random cards
        random_card_resource_address: ResourceAddress,
        /// The price of each random card
        random_card_price: Decimal,
        /// A counter for ID generation
        random_card_id_counter: u64,
        /// A vault that collects all XRD payments
        collected_srjg: Vault,
        accepted_payment_token:ResourceAddress,
    }

    impl HelloNft {
        pub fn instantiate_component(accepted_payment_token:ResourceAddress) -> ComponentAddress {
            // Creates a fixed set of NFTs
            let special_cards_bucket = ResourceBuilder::new_integer_non_fungible()
                .metadata("name", "Jungler Digital Artwork collection")
                .metadata("description", "Jungler Digital artwork & Protector of a portion of rainforest")
                .mint_initial_supply([
                    (
                        IntegerNonFungibleLocalId::new(1u64),
                        MagicCard {
                            color: Color::Black,
                            rarity: Rarity::MythicRare,
                            level: 3,
                        },
                    ),
                    (
                        IntegerNonFungibleLocalId::new(2u64),
                        MagicCard {
                            color: Color::Green,
                            rarity: Rarity::Rare,
                            level: 5,
                        },
                    ),
                    (
                        IntegerNonFungibleLocalId::new(3u64),
                        MagicCard {
                            color: Color::Red,
                            rarity: Rarity::Uncommon,
                            level: 100,
                        },
                    ),
                ]);

            // Create an NFT resource with mutable supply
            let random_card_mint_badge = ResourceBuilder::new_fungible()
                .divisibility(DIVISIBILITY_NONE)
                .metadata("name", "Jungler Digital Artwork Mint Badge")
                // .mintable(rule!(require(owner-badge)),LOCKED)
                .mint_initial_supply(1);

            let random_card_resource_address = ResourceBuilder::new_integer_non_fungible()
                .metadata("name", "Jungler Digital artwork")
                .mintable(
                    rule!(require(random_card_mint_badge.resource_address())),
                    LOCKED,
                )
                .burnable(
                    rule!(require(random_card_mint_badge.resource_address())),
                    LOCKED,
                )
                .updateable_non_fungible_data(
                    rule!(require(random_card_mint_badge.resource_address())),
                    LOCKED,
                )
                .create_with_no_initial_supply();

            // Instantiate our component
            Self {
                special_cards: Vault::with_bucket(special_cards_bucket),
                special_card_prices: HashMap::from([
                    (NonFungibleLocalId::Integer(1u64.into()), 2.into()),
                    (NonFungibleLocalId::Integer(2u64.into()), 4.into()),
                    (NonFungibleLocalId::Integer(3u64.into()), 3.into()),
                ]),
                random_card_mint_badge: Vault::with_bucket(random_card_mint_badge),
                random_card_resource_address,
                random_card_price: 1.into(),
                random_card_id_counter: 0,
                collected_srjg: Vault::new(accepted_payment_token),
                accepted_payment_token
            }
            .instantiate()
            .globalize()
        }

        pub fn buy_special_card(
            &mut self,
            key: NonFungibleLocalId,
            mut payment: Bucket,
        ) -> (Bucket, Bucket) {
            // Take our price out of the payment bucket
            let price = self.special_card_prices.remove(&key).unwrap();
            self.collected_srjg.put(payment.take(price));

            // Take the requested NFT
            let nft_bucket = self.special_cards.take_non_fungible(&key);

            // Return the NFT and change
            (nft_bucket, payment)
        }

        pub fn buy_random_card(&mut self, mut payment: Bucket) -> (Bucket, Bucket) {
            // Take our price out of the payment bucket
            self.collected_srjg.put(payment.take(self.random_card_price));

            // Mint a new card
            let random_seed = 100; // TODO: obtain from oracle
            let new_card = MagicCard {
                color: Self::random_color(random_seed),
                rarity: Self::random_rarity(random_seed),
                level: random_seed as u8 % 8,
            };
            let nft_bucket = self.random_card_mint_badge.authorize(|| {
                borrow_resource_manager!(self.random_card_resource_address).mint_non_fungible(
                    &NonFungibleLocalId::Integer(self.random_card_id_counter.into()),
                    new_card,
                )
            });
            self.random_card_id_counter += 1;

            // Return the NFT and change
            (nft_bucket, payment)
        }

    //     pub fn upgrade_my_card(&mut self, nft_bucket: Bucket) -> Bucket {
    //         assert!(
    //             nft_bucket.amount() == dec!("1"),
    //             "We can upgrade only one card each time"
    //         );

    //         // Get and update the mutable data
    //         let mut non_fungible_data: MagicCard = nft_bucket.non_fungible().data();
    //         non_fungible_data.level += 1;

    //         self.random_card_mint_badge
    //             .authorize(|| nft_bucket.non_fungible().update_data(non_fungible_data));

    //         nft_bucket
    //     }

    //     pub fn fuse_my_cards(&mut self, nft_bucket: Bucket) -> Bucket {
    //         assert!(
    //             nft_bucket.amount() == dec!("2"),
    //             "You need to pass 2 NFTs for fusion"
    //         );
    //         assert!(
    //             nft_bucket.resource_address() == self.random_card_resource_address,
    //             "Only random cards can be fused"
    //         );

    //         // Retrieve the NFT data.
    //         let card1: MagicCard = nft_bucket.non_fungibles()[0].data();
    //         let card2: MagicCard = nft_bucket.non_fungibles()[1].data();
    //         let new_card = Self::fuse_magic_cards(card1, card2);

    //         // Burn the original cards
    //         self.random_card_mint_badge.authorize(|| {
    //             nft_bucket.burn();
    //         });

    //         // Mint a new one.
    //         let new_non_fungible_bucket = self.random_card_mint_badge.authorize(|| {
    //             borrow_resource_manager!(self.random_card_resource_address).mint_non_fungible(
    //                 &NonFungibleLocalId::Integer(self.random_card_id_counter.into()),
    //                 new_card,
    //             )
    //         });
    //         self.random_card_id_counter += 1;

    //         new_non_fungible_bucket
    //     }

    //     fn fuse_magic_cards(card1: MagicCard, card2: MagicCard) -> MagicCard {
    //         MagicCard {
    //             color: card1.color,
    //             rarity: card2.rarity,
    //             level: card1.level + card2.level,
    //         }
    //     }

        fn random_color(seed: u64) -> Color {
            match seed % 5 {
                0 => Color::White,
                1 => Color::Blue,
                2 => Color::Black,
                3 => Color::Red,
                4 => Color::Green,
                _ => panic!(),
            }
        }

        fn random_rarity(seed: u64) -> Rarity {
            match seed % 4 {
                0 => Rarity::Common,
                1 => Rarity::Uncommon,
                2 => Rarity::Rare,
                3 => Rarity::MythicRare,
                _ => panic!(),
            }
        }
    }
}