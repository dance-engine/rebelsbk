// import { auth } from '@clerk/nextjs/server';
// import { currentUser } from '@clerk/nextjs/server';

export async function GET(request) {
  // const { userId } = await auth();

  // if (!userId) {
  //   return Response.json({ error: "User is not signed in." }, { status: 401 });
  // }

  // const user = await currentUser();
  // if (!user) {
  //   return Response.json({ error: "User is not signed in!" }, { status: 401 });
  // }

  // if (!user.publicMetadata.admin) {
  //   return Response.json({ error: "User does not have access permissions." }, { status: 403 });
  // }

  // Extract query parameters
  const { searchParams } = new URL(request.url);
  const eventSlug = searchParams.get("event");
  console.log("event slug:", eventSlug)

  // Construct the URLs dynamically
  // const individualItemsURL = eventSlug
  //   ? `${process.env.LAMBDA_INDIVIDUAL_ITEMS}?event=${eventSlug}`
  //   : `${process.env.LAMBDA_INDIVIDUAL_ITEMS}`;

  // const passesURL = eventSlug
  //   ? `${process.env.LAMBDA_PASSES}?event=${eventSlug}`
  //   : `${process.env.LAMBDA_PASSES}`;

  // console.log(passesURL)
  // console.log(individualItemsURL)

  const eventsURL = [process.env.LAMBDA_EVENTS,eventSlug].filter(elm => elm).join('?event=')
  console.log("eventsURL",eventsURL)

  try {
    // // Fetch individual items
    // const individualItemsResponse = await fetch(individualItemsURL, {
    //   method: 'GET',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    // });

    // if (!individualItemsResponse.ok) {
    //   throw new Error("Failed to fetch individual items.");
    // }

    // const individualItemsData = await individualItemsResponse.json();

    // Fetch events
    const passesResponse = await fetch(eventsURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!passesResponse.ok) {
      throw new Error("Failed to fetch passes.");
    }

    const passesData = await passesResponse.json();

    // Combine and return data
    const response = passesData;

    console.log(response)
    return Response.json(response, { status: 200 });
  } catch (error) {
    console.log("Error fetching data: %s", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
