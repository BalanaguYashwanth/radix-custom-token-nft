use scrypto::prelude::*;

#[derive(ScryptoCategorize, ScryptoEncode, ScryptoDecode, LegacyDescribe)]
pub enum Color {
    White,
    Blue,
    Black,
    Red,
    Green,
}

#[derive(NonFungibleData)]
pub struct NFTData{
    name:String,
    asset_tag:String,
    weather:String,
    landscape:String,
    time:String,
    country:String,
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
        //All mined gumballs store here
        gumballs: Vault,
        //A XRD vault that collects all XRD payments
        collected_xrd: Vault,
        //Price of gumballs
        price: Decimal,
        //Badge authorization
        admin_mint_badge: Vault,
        //Special Cards container
        special_cards: Vault,
        /// The price for each special card
        special_card_prices: HashMap<NonFungibleLocalId, Decimal>,
        /// The resource address of all random cards
        random_card_resource_address: ResourceAddress,
        /// The price of each random card
        random_card_price: Decimal,
        /// A counter for ID generation
        random_card_id_counter: u64,
        /// A vault that collects all custom payments
        collected_srjg: Vault,
    }

    impl GumballMachine {
        // given a price in XRD, creates a ready-to-use gumball machine
        pub fn instantiate_gumball_machine(price: Decimal) -> ComponentAddress {
            let admin_mint_badge = ResourceBuilder::new_fungible()
                .divisibility(DIVISIBILITY_NONE)
                .metadata("name", "Admin Badge")
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
            
            let special_cards_bucket = ResourceBuilder::new_integer_non_fungible()
                .metadata("name", "Jungler Digital Artwork Special")
                .metadata(
                    "description",
                    "Jungler Digital artwork & Protector of a portion of rainforest"
                )
                .mint_initial_supply([
                    (
                        IntegerNonFungibleLocalId::new(1u64),
                        NFTData{
                            name:String::from("Baobab Tree"),
                            asset_tag:String::from("https://images.unsplash.com/photo-1502082553048-f009c37129b9?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80"),
                            landscape:String::from("AI"),
                            weather:String::from("AI"),
                            time:String::from("sunset"),
                            country:String::from("srilanka")
                        }
                    ),
                    (
                        IntegerNonFungibleLocalId::new(2u64),
                        NFTData{
                            name:String::from("Sandpaper Flower"),
                            asset_tag:String::from("https://images.unsplash.com/photo-1502082553048-f009c37129b9?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80"),
                            landscape:String::from("glade"),
                            weather:String::from("rainy"),
                            time:String::from("daytime"),
                            country:String::from("srilanka")
                        }
                    ),
                    (
                        IntegerNonFungibleLocalId::new(3u64),
                        NFTData{
                            name:String::from("Banyan Tree"),
                            asset_tag:String::from("https://images.unsplash.com/photo-1487139975590-b4f1dce9b035?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=988&q=80"),
                            landscape:String::from("tropical scenery"),
                            weather:String::from("rainy"),
                            time:String::from("sunset"),
                            country:String::from("srilanka")
                        }
                    ),
                ]);

            let random_card_resource_address = ResourceBuilder::new_integer_non_fungible()
                .metadata("name", "Jungler Digital artwork")
                .mintable(rule!(require(admin_mint_badge.resource_address())), LOCKED)
                .burnable(rule!(require(admin_mint_badge.resource_address())), LOCKED)
                .updateable_non_fungible_data(
                    rule!(require(admin_mint_badge.resource_address())),
                    LOCKED
                )
                .create_with_no_initial_supply();


            // populate a GumballMachine struct and instantiate a new component
            (Self {
                admin_mint_badge: Vault::with_bucket(admin_mint_badge),
                collected_srjg: Vault::new(bucket_of_gumballs.resource_address()), 
                gumballs: Vault::with_bucket(bucket_of_gumballs),
                collected_xrd: Vault::new(RADIX_TOKEN),
                price: price,
                special_cards: Vault::with_bucket(special_cards_bucket),
                special_card_prices: HashMap::from([
                    (NonFungibleLocalId::Integer((1u64).into()), (2).into()),
                    (NonFungibleLocalId::Integer((2u64).into()), (4).into()),
                    (NonFungibleLocalId::Integer((3u64).into()), (3).into()),
                ]),
                random_card_resource_address,
                random_card_price: (1).into(),
                random_card_id_counter: 0,
            }).instantiate()
            .globalize()
        }

        pub fn get_price(&self) -> Decimal {
            self.price
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


        pub fn buy_gumball(
            &mut self,
            gumball_tokens: Decimal,
            mut payment: Bucket
        ) -> (Bucket, Bucket) {
            assert!(
                payment.amount() >= gumball_tokens * self.price,
                "Not enough tokens or coins sent!"
            );

            let our_share = payment.take(gumball_tokens * self.price);
            self.collected_xrd.put(our_share);

            (self.gumballs.take(gumball_tokens), payment)
        }


        pub fn buy_special_card(
            &mut self,
            key: NonFungibleLocalId,
            mut payment: Bucket
        ) -> (Bucket, Bucket) {
            assert!(
                payment.resource_address() == self.collected_srjg.resource_address(),
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
                payment.resource_address() == self.collected_srjg.resource_address(),
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
            let nft_bucket = self.admin_mint_badge.authorize(|| {
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
