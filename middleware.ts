import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// import {searchParams} from 'next/'
 
// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // return NextResponse.redirect(new URL('/home', request.url))
  // console.log(request)
  const nextUrl = request.nextUrl
  const method = nextUrl.searchParams.get("_method")
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-new-method', method ? method : "NOCHANGE")

  // const response = method ? NextResponse.next({ headers: { method: method }}) : NextResponse.next()
  const response = NextResponse.next({
    request: {
      // New request headers
      headers: requestHeaders,
    },
  })
  // console.log(response)
  // request.method = method ? method : request.method
  return response
}
 
// See "Matching Paths" below to learn more
export const config = {
  matcher: '/api/session',
}