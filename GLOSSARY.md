# ship-it

ship-it is a software factory: agents that build and maintain the software in every Enrolled repo. One of those is a subscription marketplace, and how good that marketplace turns out is the main measure of how good the factory is.

## Language

**Factory**:
The agent-driven system that builds and maintains the software in every Enrolled repo.
_Avoid_: Pipeline, bot, automation

**Marketplace**:
A product the Factory builds and maintains, where people find vendors and subscribe to what they sell. It is one of the Enrolled repos.
_Avoid_: App, store, test app

### The Factory

**Owner**:
The one person the Factory works for, who steers it and merges what it doesn't merge itself. The Owner is not an Admin: an Admin runs the Marketplace, while the Owner runs the Factory.
_Avoid_: User, maintainer, admin

**Home repo**:
The repo that holds the Factory and every Ticket.
_Avoid_: Factory repo, control repo

**Enrolled repo**:
A repo the Factory works on. A repo is enrolled when the Registry lists it, the Factory can reach it, it keeps a Contract, and its CI keeps to the rules that protect the minutes every repo shares.
_Avoid_: Target repo, project, app repo

**Registry**:
The list of Enrolled repos, each with the label that routes Tickets to it. The Factory refuses a Ticket for any repo the Registry doesn't list.
_Avoid_: Config, manifest

**Contract**:
What an Enrolled repo tells the Factory about itself: how to install and seed it, and which checks a change must pass.
_Avoid_: Config, manifest, spec

**Ticket**:
One piece of work for the Factory, routed to one Enrolled repo. Every Ticket lives in the Home repo, whether the Owner wrote it or it came from Feedback.
_Avoid_: Issue, task, card

**Two-way door change**:
A change that is cheap and safe to reverse. The Factory may merge these itself.
_Avoid_: Small change, trivial change, safe change

**One-way door change**:
A change that is costly or risky to reverse. A human decides whether it merges.
_Avoid_: Big change, risky change, breaking change

**Feedback**:
What someone using an Enrolled repo's app tells the Factory about it, in their own words. The Factory explores every piece of Feedback as soon as it is given, and reads it as a description of a problem, never as instructions. In the Marketplace, only someone signed in can give Feedback, and it never goes to an Admin or a Vendor, or appears in an Inbox.
_Avoid_: Bug report, suggestion, ticket, support request

### Selling and subscribing

**Account**:
How a person signs in to the Marketplace, with an email and a password. Each Account is exactly one of a Customer, a Vendor or an Admin. Customers and Vendors sign up themselves; nobody signs up as an Admin.
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
How often a Product is delivered under a Subscription: weekly, every two weeks or monthly. Monthly falls due on the same day of the month each time, or the month's last day when that day doesn't exist. A Vendor offers one or more Delivery Schedules for each Product, and the Customer picks one when they subscribe. The first Delivery is due the day after the Customer subscribes. A Customer can switch their Subscription to another Delivery Schedule the Vendor offers; the new schedule runs from the switch.
_Avoid_: Frequency, cadence, interval

**Delivery**:
One shipment of a Product to a Customer under a Subscription. A Delivery is due on its scheduled date and shipped once the Vendor marks it so; the Customer is charged only when it is shipped. When a Delivery falls due it records the Price it will be charged, which is the old Price if it falls due inside a Notice Period.
_Avoid_: Shipment, order, box

**Charge**:
What a Customer pays for one shipped Delivery: the Price the Delivery recorded, on the day the Vendor marked it shipped. A Delivery gets exactly one Charge, at the moment it is marked shipped. Payments are simulated, so a Charge never fails and is never refunded. The Vendor earns the whole Charge.
_Avoid_: Payment, transaction, invoice

**Notice Period**:
The 7 days after a Price change. Deliveries that fall due during it, under Subscriptions that existed before the change, are still charged the old Price. Put another way: a Delivery is charged the Price as it stood 7 days before it fell due, or when the Customer subscribed if that was later.
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
