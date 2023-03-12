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
        admin_mint_badge: Vault,
        admin_badge: ResourceAddress,
    }

    impl GumballMachine {
        // given a price in XRD, creates a ready-to-use gumball machine
        pub fn instantiate_gumball_machine(price: Decimal) -> (ComponentAddress, Bucket) {
            let admin_mint_badge = ResourceBuilder::new_fungible()
                .divisibility(DIVISIBILITY_NONE)
                .mint_initial_supply(1);

            // create a new Gumball resource, with a fixed quantity
            let bucket_of_gumballs = ResourceBuilder::new_fungible()
                .divisibility(DIVISIBILITY_NONE)
                .metadata("name", "SriLankaJungler")
                .metadata("shortname", "Jungler")
                .metadata("symbol", "SLJG")
                .metadata("description", "A precious coin")
                .mintable(rule!(require(admin_mint_badge.resource_address())), LOCKED)
                .burnable(rule!(require(admin_mint_badge.resource_address())), LOCKED)
                .mint_initial_supply(10000);

            let admin_badge = ResourceBuilder::new_fungible()
                .divisibility(DIVISIBILITY_NONE)
                .metadata("name", "admin_badge_jungler")
                .metadata("symbol", "AJG")
                .mintable(rule!(require(admin_mint_badge.resource_address())), LOCKED)
                .burnable(rule!(require(admin_mint_badge.resource_address())), LOCKED)
                .create_with_no_initial_supply();

            // Using our minting authority badge, mint a single admin badge
            let first_admin_badge = admin_mint_badge.authorize(|| {
                let admin_badge_manager = borrow_resource_manager!(admin_badge);
                admin_badge_manager.mint(1)
            });

            // populate a GumballMachine struct and instantiate a new component
            let gumball_machine_component = (Self {
                admin_mint_badge: Vault::with_bucket(admin_mint_badge),
                gumballs: Vault::with_bucket(bucket_of_gumballs),
                admin_badge: admin_badge,
                collected_xrd: Vault::new(RADIX_TOKEN),
                price: price,
            }).instantiate();

            let component_address = gumball_machine_component.globalize();

            (component_address, first_admin_badge)
        }

        pub fn get_price(&self) -> Decimal {
            self.price
        }

        pub fn destroy_admin_badge(&mut self, to_destroy: Bucket) {
            assert!(
                to_destroy.resource_address() == self.admin_badge,
                "Cannot destroy the contents of this bucket!"
            );
            self.admin_mint_badge.authorize(|| {
                to_destroy.burn();
            })
        }

        pub fn destroy_tokens(&mut self, tokens: Bucket) {
            assert!(
                tokens.resource_address() == self.gumballs.resource_address(),
                "Cannot destroy the contents of this token or coin"
            );
            self.admin_mint_badge.authorize(|| {
                tokens.burn();
            })
        }

        // pub fn destroy_tokens(&mut self, badge:Bucket, tokens: Bucket) {
        //     assert!(
        //         tokens.resource_address() == self.gumballs.resource_address(),
        //         "Cannot destroy the contents of this token or coin"
        //     );
        //     assert!(
        //         badge.resource_address() == self.admin_badge,
        //         "Required badge to burn"
        //     );
        //     self.admin_mint_badge.authorize(|| {
        //         tokens.burn();
        //     })
        // }

        pub fn buy_gumball(
            &mut self,
            gumball_tokens: Decimal,
            mut payment: Bucket
        ) -> (Bucket, Bucket) {
            assert!(
                payment.amount() >= gumball_tokens * self.price,
                "Not enough tokens or coins sent!"
            );

            //loan_amount* dec!("1.001")

            let our_share = payment.take(gumball_tokens * self.price);
            self.collected_xrd.put(our_share);

            // we could have simplified the above into a single line, like so:
            // self.collected_xrd.put(payment.take(self.price));

            // return a tuple containing a gumball, plus whatever change is left on the input payment (if any)
            // if we're out of gumballs to give, we'll see a runtime error when we try to grab one
            (self.gumballs.take(gumball_tokens), payment)
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
        accepted_payment_token: ResourceAddress,
    }

    impl HelloNft {
        pub fn instantiate_component(accepted_payment_token: ResourceAddress) -> ComponentAddress {
            // Creates a fixed set of NFTs
            let special_cards_bucket = ResourceBuilder::new_integer_non_fungible()
                .metadata("name", "Jungler Digital Artwork collection")
                .metadata(
                    "description",
                    "Jungler Digital artwork & Protector of a portion of rainforest"
                )
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
                .mint_initial_supply(1);

            let random_card_resource_address = ResourceBuilder::new_integer_non_fungible()
                .metadata("name", "Jungler Digital artwork")
                .mintable(rule!(require(random_card_mint_badge.resource_address())), LOCKED)
                .burnable(rule!(require(random_card_mint_badge.resource_address())), LOCKED)
                .updateable_non_fungible_data(
                    rule!(require(random_card_mint_badge.resource_address())),
                    LOCKED
                )
                .create_with_no_initial_supply();

            // Instantiate our component
            (Self {
                special_cards: Vault::with_bucket(special_cards_bucket),
                special_card_prices: HashMap::from([
                    (NonFungibleLocalId::Integer((1u64).into()), (2).into()),
                    (NonFungibleLocalId::Integer((2u64).into()), (4).into()),
                    (NonFungibleLocalId::Integer((3u64).into()), (3).into()),
                ]),
                random_card_mint_badge: Vault::with_bucket(random_card_mint_badge),
                random_card_resource_address,
                random_card_price: (1).into(),
                random_card_id_counter: 0,
                collected_srjg: Vault::new(accepted_payment_token), //need to strictly hardcode the resource address of gumball or instantie these in gumball section
                accepted_payment_token, //need to hardcode or mix with gumball section
            })
                .instantiate()
                .globalize()
        }

        pub fn buy_special_card(
            &mut self,
            key: NonFungibleLocalId,
            mut payment: Bucket
        ) -> (Bucket, Bucket) {
            assert!(
                payment.resource_address() == self.accepted_payment_token,
                "send correct token"
            );

            // Take our price out of the payment bucket
            let price = self.special_card_prices.remove(&key).unwrap();
            self.collected_srjg.put(payment.take(price));

            // Take the requested NFT
            let nft_bucket = self.special_cards.take_non_fungible(&key);

            // Return the NFT and change
            (nft_bucket, payment)
        }

        pub fn buy_random_card(&mut self, mut payment: Bucket) -> (Bucket, Bucket) {
            assert!(
                payment.resource_address() == self.accepted_payment_token,
                "Please send correct token"
            );

            // Take our price out of the payment bucket
            self.collected_srjg.put(payment.take(self.random_card_price));

            // Mint a new card
            let random_seed = 100; // TODO: obtain from oracle
            let new_card = MagicCard {
                color: Self::random_color(random_seed),
                rarity: Self::random_rarity(random_seed),
                level: (random_seed as u8) % 8,
            };
            let nft_bucket = self.random_card_mint_badge.authorize(|| {
                borrow_resource_manager!(self.random_card_resource_address).mint_non_fungible(
                    &NonFungibleLocalId::Integer(self.random_card_id_counter.into()),
                    new_card
                )
            });
            self.random_card_id_counter += 1;

            // Return the NFT and change
            (nft_bucket, payment)
        }

      
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
