const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { NextRequest, NextResponse } from 'next/server'


export async function POST(request: NextRequest) {
  console.log("Creating Stripe Checkout Session...")
  const data = await request.json()
  const userData = data.userData
  const attendee = {
    name: userData.name,
    phone: userData.phone,
  }
  const preferences = data.preferences
  const group = { id: data.preferences.seating_preference, recommendations: data.preferences.recommendations }
  const lineItems = data.products.map((priceId)=>{
    return {
      price: priceId,
      quantity: 1 //TODO This should come from the client eventually
    }
  })
  const checkoutSessionObject = {
    ui_mode: 'embedded',
    line_items: lineItems,
    mode: 'payment',
    customer_email: userData.email,
    // phone_number_collection: { enabled: true},
    metadata: {
      attendee: JSON.stringify(attendee),
      preferences: JSON.stringify(preferences),
      group: JSON.stringify(group)
      //! Adam TODO: Include 'parent_event': "EVENT#{slug-of-event}" (Please send as a string)
    },
    allow_promotion_codes: true,
    return_url:
      `${request.headers.get("origin")}/return?session_id={CHECKOUT_SESSION_ID}`,
  }

  console.log("Checkout Session:",checkoutSessionObject)
  try {
    // Create Checkout Sessions from body params.
    const session = await stripe.checkout.sessions.create(checkoutSessionObject, { stripeAccount: 'acct_1RT4baRWBoTdG7OY',  });
    console.log("session:",session)
    return NextResponse.json({clientSecret: session.client_secret});
  } catch (err) {
    console.log("Stripe Error:",err)
    return NextResponse.json({error: err.message}, {status: err.statusCode || 500});
  }
}

export async function GET(_request: NextRequest, { params }: { params: { session_id: string } }) {
  try {
    const session =
      await stripe.checkout.sessions.retrieve(params.session_id);

    return NextResponse.json({
      status: session.status,
      customer_email: session.customer_details.email
    });
  } catch (err) {
    return NextResponse.json( err.message, {status: err.statusCode || 500});
  }
}