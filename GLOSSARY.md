# ship-it

ship-it is a software factory: agents that build and maintain a product. The product it builds is a subscription marketplace, and how good that marketplace turns out is the main measure of how good the factory is.

## Language

**Factory**:
The agent-driven system that builds and maintains the Marketplace.
_Avoid_: Pipeline, bot, automation

**Marketplace**:
The product the Factory builds and maintains, where people find vendors and subscribe to what they sell.
_Avoid_: App, store, test app

### The Factory

**Two-way door change**:
A change that is cheap and safe to reverse. The Factory may merge these itself.
_Avoid_: Small change, trivial change, safe change

**One-way door change**:
A change that is costly or risky to reverse. A human decides whether it merges.
_Avoid_: Big change, risky change, breaking change

### Selling and subscribing

**Account**:
How a person signs in to the Marketplace. Each Account is exactly one of a Customer, a Vendor or an Admin.
_Avoid_: User, login, profile

**Admin**:
A person who runs the Marketplace, including deciding which Vendors are approved.
_Avoid_: Operator, moderator, staff, owner

**Customer**:
A person who uses the Marketplace to find Vendors and subscribe to their Products, whether or not they currently have any Subscriptions.
_Avoid_: Subscriber, buyer, user

**Vendor**:
A business that sells Products through the Marketplace. A Vendor signs up themselves, an Admin approves or rejects them, and only an approved Vendor's Products appear to Customers.
_Avoid_: Seller, merchant, supplier

**Product**:
A physical good a Vendor sells, delivered on a schedule.
_Avoid_: Item, offering, listing

**Subscription**:
An ongoing arrangement to receive one Product on a schedule. There is no vendor-wide subscription: subscribing to all of a Vendor's Products means one Subscription per Product. A Customer can cancel a Subscription at any time: no new Deliveries fall due after that, but any already due still stand. If the Vendor stops selling the Product, or stops offering the Subscription's Delivery Schedule, the Subscription is cancelled and the Customer is notified.
_Avoid_: Plan, membership, order

**Delivery Schedule**:
How often a Product is delivered under a Subscription. A Vendor offers one or more Delivery Schedules for each Product, and the Customer picks one when they subscribe. A Customer can switch their Subscription to another Delivery Schedule the Vendor offers; the new schedule runs from the switch.
_Avoid_: Frequency, cadence, interval

**Delivery**:
One shipment of a Product to a Customer under a Subscription. A Delivery is due on its scheduled date and shipped once the Vendor marks it so; the Customer is charged only when it is shipped.
_Avoid_: Shipment, order, box

**Notice Period**:
The 7 days after a Price change. Deliveries that fall due during it are still charged the old Price.
_Avoid_: Grace period, warning period

**Notification**:
A message the Marketplace puts in someone's Inbox to tell them something changed.
_Avoid_: Alert, message, email

**Inbox**:
The place inside the Marketplace where someone reads their Notifications. Customers, Vendors and Admins each have one.
_Avoid_: Mailbox, feed, notification centre

**Delivery Address**:
Where a Customer's Deliveries are sent. Each Customer has one, used for all their Subscriptions.
_Avoid_: Shipping address, destination

**Price**:
What a Customer is charged for each Delivery of a Product. A Product has one Price, whatever Delivery Schedule the Customer picks. When a Vendor changes a Price, every Customer subscribed to that Product is notified, and the new Price applies to their Subscriptions.
_Avoid_: Cost, fee, rate
