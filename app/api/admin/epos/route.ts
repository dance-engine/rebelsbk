import { createClerkClient } from '@clerk/backend';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
// import  Pusher from 'pusher'

// const pusher = new Pusher({
//   appId: process.env.PUSHER_APP_ID,
//   key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY,
//   secret: process.env.PUSHER_APP_SECRET,
//   cluster: "eu",
//   useTLS: true
// });


export async function POST(request: Request) {
  const body = await request.json()
  console.log(body)

  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const {userId} = await auth();

  if(!userId){
    return Response.json({error: "User is not signed in."}, { status: 401 });
  }

  const requestingUser = await clerkClient.users.getUser(userId);
  if(!requestingUser.publicMetadata.admin){
    return Response.json({error: "User is does not have permissions."}, { status: 401 });
  }

  const checkoutUrl = process.env.LAMBDA_CHECKOUT_COMPLETE_INPERSON

  const checkoutResponse = await fetch(checkoutUrl, {
    method: 'POSt',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body) //! Adam TODO: Make sure body includes 'parent_event': "EVENT#{slug-of-event}"
  })
  if(!checkoutResponse.ok) {
    const checkoutData = await checkoutResponse.json()
    return NextResponse.json({...checkoutData, generated_at: new Date().toISOString() }, {status: checkoutResponse.status})
  }
  const checkoutData = await checkoutResponse.json()
  const ticket_number = checkoutData.ticket_number
  // const ticket_number = 2212652493 //! This should be returned
  // console.log("checkoutData",checkoutData)
    return NextResponse.json({ ticket_number: ticket_number, generated_at: new Date().toISOString() })
  // }
}