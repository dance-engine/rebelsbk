import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json()
  const checkoutUrl = process.env.LAMBDA_CHECKOUT_COMPLETE_INPERSON

  
  const checkoutPromises = body.map(async (checkoutObj) => {
    // console.log("checkoutObj",checkoutObj)
    return fetch(checkoutUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutObj) 
    })
  })
  const responses = await Promise.all(checkoutPromises)
  const success = responses.every((response) => { return response.ok})
  // const details = await Promise.all
  console.log(responses,success)
  // const checkoutResponse = await fetch(checkoutUrl, {
  //   method: 'POSt',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify(body) //! Adam TODO: Make sure body includes 'parent_event': "EVENT#{slug-of-event}"
  // })
  if(!success) {
    return NextResponse.json({error: "Could not generate all tickets", generated_at: new Date().toISOString() }, {status: 500})
  }
  // const checkoutData = await checkoutResponse.json()
  // const ticket_number = checkoutData.ticket_number
  // const ticket_number = 2212652493 //! This should be returned
  // console.log("checkoutData",checkoutData)
    // return NextResponse.json({ ticket_number: ticket_number, generated_at: new Date().toISOString() })
    return NextResponse.json({ message: "Tickets have been emailed to you", generated_at: new Date().toISOString() })
  // }
}