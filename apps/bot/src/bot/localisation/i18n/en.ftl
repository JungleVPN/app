dear-friend=Dear Friend
provider-description-text = Happy to see you in the JUNGLE 🌴
open-app-button-label = Open app 📲
connect-button-label = Connect 📶
extend-button-label = Extend ➕
pay-button-label = Pay 💶
donate-button-label = Donate 💶
available-countries-button-label = Countries 🌍
not-workinig-button-label = VPN is not working 🚨
support-button-label = Support
home-button-label = Home 🏠
profile-button-label = Profile 👤
invoice-button-label = Invoice 📄
subscription-button-label = Autopayment 🔄
download-button-label = Install 🔽
back-button-label = ⤴ Back
payment-method-eur = 💶 Pay in €
payment-method-rub = 💳 Pay in ₽
payment-period-button-label-1 =  1  month
payment-period-button-label-2 =  3  months ({ $discount })
payment-period-button-label-3 =  6  months ({ $discount })
pay-button-label = Pay 💳
add-link-button-label = Add link 🔗
add-v2raytun-profile-button-label = Add to v2raytun 🔗
add-happ-profile-button-label = Add to Happ 🔗
new-link-button-label = New link 🔄
referra-button-label = Referral 🤝
invite-button-label = Invite 🖖
invite-inline-title = Invite a friend to JUNGLE 🌴
invite-inline-description = Thank you for inviting people to the Jungle 🙃
chanel-button-label = Telegram chanel 🌟
broadcast-sent-success = ✅ Message sent to all users!
error-menu-outdated = Something changed, try /start again
error-generic-restart = ❗ Something went wrong. Try /start again
payment-not-found = ❗ Payment not found. Try /start again
payment-pending = ❗ Payment is still pending.
period-1 = 1 month
period-3 = 3 months
period-6 = 6 months

days-left-label = { $daysLeft ->
    [one] { $daysLeft } day
    *[other] { $daysLeft } days
  }


main-text =
    🌴 Great to see you, <b>{ $username }</b>!

    Here is some info about your subscription:

    <blockquote>
    { $isExpired ->
    [true]🆘🆘🆘 <b>Your subscription has expired 🥲</b>
    *[false]📅End date: <b>{ $expireAt } (MSK)</b>

    📱Max devices: <b>{ $devicesLimit }</b>
    }
    </blockquote>


    My contacts:
    <blockquote>
        <code>Telegram</code>: @Ramazzaniii
        <code>Channel</code>: @In_The_Jungle
        <code>LinkedIn</code>: <a href="https://www.linkedin.com/in/ramazan-ittiev/">Link</a>
    </blockquote>

setup-prompt-text =
    🌴 Welcome to the <code>Jungle</code>, <b>{ $username }</b>!
    I’m @Ramazzaniii, the creator of <code>JungleVPN</code> 🌴

    To get started, open the app and get your subscription 🙂


    My contacts:
    <blockquote>
        <code>Telegram</code>: @Ramazzaniii
        <code>Channel</code>: @In_The_Jungle
        <code>LinkedIn</code>: <a href="https://www.linkedin.com/in/ramazan-ittiev/">Link</a>
    </blockquote>

donate-text =
    Thank you for wanting to support the project 💙

    If you have ideas, thoughts, or any feedback — feel free to reach out, I’ll be happy to hear from you 🙂

    My contacts:
    <blockquote>
        <code>Telegram</code>: @Ramazzaniii
        <code>Channel</code>: @In_The_Jungle
        <code>LinkedIn</code>: <a href="https://www.linkedin.com/in/ramazan-ittiev/">Link</a>
    </blockquote>



available-countries-text =
    🌍 Here’s the list of countries available for connection:

    ╠ 🇩🇪 Germany
    ╠ 🇵🇱 Poland
    ╠ 🇫🇮 Finland
    ╠ 🇷🇺 Russia
    ╚ More coming…

    Also...

    ⚡️ Unlimited traffic
    🔒 Access to Russian and international resources


devices-text =
    📱 <b>Choose the platform where you want to set up the VPN:</b>

    Next you’ll get instructions on how to install and configure it 🙂


revoked-sub-text =
    Your subscription has been revoked ✅

    Now, please try to connect again. Just press the button below and follow the instructions.

    Your Jungle 🌴

payment-periods-text =
    <b>How long do you want to subscribe to the VPN?</b>

    <blockquote>If your subscription is active, the paid period will be added to the current one</blockquote>


payment-methods-text =
    Currently only 🇷🇺Russian payment methods are supported

payment-text =
    <b>As soon as you pay, come back to get the connection link</b>

    <blockquote>You’re paying <b>{ $amount }{ $currency }</b> for <b>{ $period }</b></blockquote>

    By paying you accept terms and conditions - { $link }

payment-success-text =
    ✅ Payment successful! Thank you for your support!

    Your subscription has been extended 🙂

    You can manage payments in your profile. Just click the button below!

    I will add ability to control notifications a bit later

subscription-text =
    📖 Setting up VPN on { $deviceLabel }:

    1️⃣ Install the «{ $clientAppLabel }» app.
    <i>Tap the «Download» button</i>

    2️⃣ Tap «Add profile».

    <i>Choose the desired location and tap the connect button</i>


    <b><i>{ $subUrl }</i></b>

    <b>Here’s the link if you already have the app</b>



user-not-connected-24 =
    🌴🐵🌴

    Psst... You haven't connected yet
    Keep your data safe in the <code>Jungle</code>

    Connect and enjoy 🙂



user-not-connected-72 =
    You are still not connected

    Let me help you, it will take less then a minute 🙂


expires-in-48-hours-subscription-text =
    Your subscription expires in <b>2 days</b> 🌴

    End date is
    <blockquote>{ $formattedDate }</blockquote>

    Renew now to stay connected without interruption

    Jungle 🌴


expires-in-24-hours-subscription-text =
    Your subscription expires in <b>1 day</b> 🥲

    End date is
    <blockquote>{ $formattedDate }</blockquote>

    Last chance — renew today to avoid losing access

    Jungle 🌴


expired-subscription-text =
    Your subscription has expired, but you don't have any active payment methods to activate it 🥲

    Click the button bellow to make a payment

    With love, Jungle 🌴


expired-24-hours-ago-subscription-text =
    Your subscription expired 24 hours ago 🥲

    If you had any issues with renewing, contact support, I'll help you 🙂

    Your Jungle  🌴



torrent-warning-text =
    Warning!

    Downloading torrents is currently prohibited.

    <blockquote>Repeated violation of this rule will block your connection for 5 minutes. (Every time)</blockquote>

    Please use the VPN only for legal purposes and follow the service rules.

    Thank you for understanding!



invoice-payment-success-text =
    Your payment has been successful! 🙂

    Thank you for staying in the <code>Jungle</code>

    You can easily manage your subscription by clicking the button below

    📅 <b>New subscription end date:</b> 🌟
    <blockquote>{ $expireAt }</blockquote>



payment-failed-text =
    ❗ <b>Payment failed</b>

    We couldn't process the payment for your subscription.
    Please check your payment method or try again later.

    You can manage your subscription via the Profile menu.


no-active-method-text =
    ❗Your subscription will expire in 24 hours, but you don't have any active payment methods.

    Please pay manaully by clicking the button below.


payment-failed-insufficient-funds-text =
    ❗ <b>Payment failed — insufficient funds</b>

    There weren't enough funds on your card to complete the payment.
    Please top up your card or use a different payment method, then try again.

    You can manage your subscription via the Profile menu.



payment-failed-card-expired-text =
    ❗ <b>Payment failed — card expired</b>

    The bank card you used has expired.
    Please pay with another card or update your card details.

    You can manage your subscription via the Profile menu.



payment-failed-invalid-card-text =
    ❗ <b>Payment failed — incorrect card details</b>

    The card number or CVV code didn't match.
    Please try again and double-check the card details you enter.

    You can manage your subscription via the Profile menu.



payment-failed-3ds-text =
    ❗ <b>Payment failed — 3-D Secure check didn't pass</b>

    The 3-D Secure authentication wasn't completed.
    Please retry the payment, contact your bank for details, or use another payment method.

    You can manage your subscription via the Profile menu.



payment-failed-fraud-text =
    ❗ <b>Payment failed — blocked for safety</b>

    The payment was blocked because it was flagged as suspicious.
    Please use a different payment method when trying again.

    You can manage your subscription via the Profile menu.



payment-failed-issuer-text =
    ❗ <b>Payment failed — declined by the bank</b>

    Your bank declined the transaction.
    Please contact your bank for details or try a different payment method.

    You can manage your subscription via the Profile menu.



payment-failed-limit-text =
    ❗ <b>Payment failed — limit reached</b>

    The payment limit for this method has been reached.
    Please try again later or use a different payment method.

    You can manage your subscription via the Profile menu.



payment-failed-country-text =
    ❗ <b>Payment failed — method not supported</b>

    Payments with this card or mobile carrier aren't supported right now.
    Please try a different payment method.

    You can manage your subscription via the Profile menu.



payment-failed-identification-text =
    ❗ <b>Payment failed — identification required</b>

    Your YooMoney wallet needs identification to complete this payment.
    Please finish identification or choose another payment method.

    You can manage your subscription via the Profile menu.



payment-failed-expired-text =
    ❗ <b>Payment failed — session expired</b>

    The payment session expired before it could be completed.
    Please start the payment again.

    You can manage your subscription via the Profile menu.



payment-failed-timeout-text =
    ❗ <b>Payment failed — temporary error</b>

    A temporary issue on the payment provider's side prevented the payment from going through.
    Please try again in a few minutes.

    You can manage your subscription via the Profile menu.



payment-failed-permission-revoked-text =
    ❗ <b>Autopayment unavailable</b>

    Autopayment permission was revoked, so we couldn't charge your card automatically.
    To renew your subscription, please start a new payment manually.

    You can manage your subscription via the Profile menu.




profile-text = { $activeMethod }

profile-active-method-text =
    💳 Active payment method: <b>{ $label }</b>

    To add a different payment method delete this one.

profile-no-active-method-text =
    You don't have an active payment method saved yet.

    It is added automatically on the first successful payment!

profile-delete-method-button-label = 🗑 Delete saved method

profile-delete-method-success = Saved payment method deleted

profile-delete-method-error = Couldn't delete the payment method, please try again



no-active-subscription-text =
    You don't have any active autopayment set up.

    Currently, autopayments are supported only for non-Russian payment methods.

    Purchase a subscription via international payment method to enable autopayments.




support-text =
    So I guess it doesn't work 😭

    1️⃣ First of all, just try to update the subscription in the app, by pressing refresh 🔄icon near to service name <b><code>🌴JungleVPN</code></b>

    2️⃣ If that didn't help, delete old subscription and generate a new one (button below). Then import it as before

    3️⃣ In case non of above helped, contact the support team. It might be a temporary issue 🥲




invitation-text =
    You have been invited to the <b>Jungle</b> by <b>{ $username }</b> 🌴

    Jungle is a VPN service. Connect easily and use the internet securely ❤️

    ⚡️Unlimited traffic
    🔒 Access to Russian and international resources


    🌍 Available countries:
    ╠ 🇩🇪 Germany
    ╠ 🇵🇱 Poland
    ╠ 🇫🇮 Finland
    ╠ 🇷🇺 Russia
    ╚ More coming…



user-rewarded-text =
    Thanks for inviting friends to <code>JUNGLE</code> 🌴

    I’ve added { $inviterPaidBonusInDays } days to your subscription ♥️

    <b>Your subscription will now expire on <blockquote>{ $formattedDate }</blockquote></b>


referral-page-text =
    Invite your friends to <code>JUNGLE</code> and get extra subscription days 😃

    For every invited user, you get <blockquote>+{ $inviterStartBonusInDays } day</blockquote>

    And if your friend makes a payment, you’ll get <blockquote>+{ $inviterPaidBonusInDays } days</blockquote>

    Sounds good, right? 🫠


referral-new-user-text =
    You followed a referral link and your friend got { $invitedStartBonusInDays } day to subscription 🥳

    By the way, if you make a payment, the person who invited you will get more extra days ♥️


referral-existing-user-text =
    You followed a referral link, but you’re already registered in the system 🖖

    By the way, if you pay for a subscription, the person who invited you will get extra days ♥️

referral-another-inviter-text =
    You followed a referral link, but you were invited by another user 🖖

    By the way, if you pay for a subscription, the person who invited you will get extra days ♥️

referral-completed-text =
    You followed your friend's referral link, but all bonuses are already applied 🖖

referral-own-user-link-text =
    You followed your own referral link. You can’t invite yourself 🥲. Tap /start