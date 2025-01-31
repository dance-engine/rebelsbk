'use client'
import useSWR, {mutate} from 'swr';
import { fetcher } from  "@lib/fetchers";
import { Fragment } from 'react';
// import { metadata } from '@app/layout';
import { priceIds } from '@components/ticketing/pricingUtilities';
import { individualTickets, passes } from '@components/ticketing/pricingDefaultsDynamic';
const toggleApiUrl = "/api/admin/stripe/webhooks"
const productsApiUrl = "/api/admin/stripe/products"

// const addWebhook = async () => {
                    
//   const createApiCall = `/api/admin/stripe/webhooks`
//   console.log('create',createApiCall)
//   const toggleApiResponse = await fetch(createApiCall, { method: 'POST'})
//   const toggleApiData = await toggleApiResponse.json()
//   console.log('createApiCall',toggleApiData)
//   setTimeout(() => mutate(toggleApiUrl), 300)
// }

const priceIdArray = [] //Object.keys(priceIds(false,passes,individualTickets)).map((key) => priceIds()[key] )

export default function StripePageClient() {
  const {data: webhookData, error: webHookError, isLoading: webhookLoading, isValidating: webhookValidating} = useSWR(toggleApiUrl, fetcher, { keepPreviousData: false });
  const {data: productsData, error: productsError, isLoading: productsLoading, isValidating: productsValidating} = useSWR(productsApiUrl, fetcher, { keepPreviousData: false });


  // if(webhookLoading) { return <p>Loading...</p> }
  // else if (webHookError) { return <p>Error on fetch {JSON.stringify(webHookError)}</p> }
  // else if(webhookData?.error) { return <p>Error in response {JSON.stringify(webhookData.error)}</p> }

  // else {

    const webHooks = webhookData && webhookData.webhooks.data
    const products = productsData && productsData.products.data
    return <div>
      
      {webhookValidating ? 
          <div role="status" className='flex'>
            <svg aria-hidden="true" className="w-4 h-4 me-2 text-gray-200 animate-spin dark:text-gray-600 fill-chillired-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/><path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/></svg>
            <span className="">Refreshing...</span>
      </div> : null}

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-base font-semibold leading-6 text-gray-100">Webhooks</h1>
            <p className="mt-2 text-sm text-gray-100">
              A list of all webhooks connect to a relevant Strip env
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            {/* <button
              type="button"
              onClick={addWebhook}
              className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Add user
            </button> */}
          </div>
        </div>

        
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-100 sm:pl-0">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-100">
                      Descr.
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-100">
                      Events
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-100">
                      URL
                    </th>
                    {/* <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                      <span className="sr-only">Action </span>
                    </th> */}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                {webhookLoading || webHookError ? <p>Loading...</p> : webHooks.map((webHook) => {
                  const baseClasses = "whitespace-nowrap px-1 py-3 text-xs text-gray-100 "
                  const baseButtonClasses = "px-3 py-1 rounded-full "
                  const statusClasses = webHook.status == 'enabled' ? baseButtonClasses + 'bg-green-800 text-green-00' : baseButtonClasses + 'bg-red-800 text-red-100'
                  const toggleStatus = webHook.status == 'enabled' ? 'disable' : 'enable'

                  const toggleFunction = async (stripe_id, status) => {
                    
                    const toggleApiCall = `/api/admin/stripe/webhook/${stripe_id}/${status}`
                    console.log('toggle',toggleApiCall)
                    const toggleApiResponse = await fetch(toggleApiCall, { method: 'POST'})
                    const toggleApiData = await toggleApiResponse.json()
                    console.log('toggleApiData',toggleApiData)
                    setTimeout(() => mutate(toggleApiUrl), 300)
                  }

                  return <tr key={webHook.id}>
                    <td className={baseClasses}>
                      <button className={statusClasses} onClick={() => toggleFunction(webHook.id,toggleStatus)}>
                        {webHook.status}
                      </button>
                    </td>
                    <td className={baseClasses}>{webHook.description}</td>
                    <td className={baseClasses}>{webHook.enabled_events.map((event) => <Fragment key={event}>{event}<br/></Fragment>)}</td>
                    <td className={baseClasses}>{webHook.url}</td>
                    {/* <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                      <button className="text-indigo-600 hover:text-indigo-900">
                        Disable <span className="sr-only">, {webHook.description}</span>
                      </button>
                    </td> */}
                  </tr>
                })}
                </tbody>
              </table>  
            </div>
          </div>
        </div>  

      </div>

      <div className="px-4 sm:px-6 lg:px-8">
      <h1>Products</h1>
      {productsValidating ? 
          <div role="status" className='flex'>
            <svg aria-hidden="true" className="w-4 h-4 me-2 text-gray-200 animate-spin dark:text-gray-600 fill-chillired-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/><path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/></svg>
            <span className="">Refreshing...</span>
      </div> : null}

      <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-100 sm:pl-0">
                      Name & Description
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-100">
                      Default Price.
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-100">
                      Access
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-100">
                      Active
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-100">
                      ID
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                      <span className="sr-only">Action </span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
      {productsLoading || productsError ? <p>Loading..</p> : products.filter((product)=>{ return product.default_price }).map((product) => {
        const baseClasses = "whitespace-nowrap px-1 py-3 text-xs text-gray-100 "

        return (<tr key={product.id}>
          <td className={baseClasses}>{product.name}</td>
          <td className={baseClasses}>{product.default_price?.unit_amount}</td>
          <td className={baseClasses}>{product.active ? "Active" : "Disabled"}</td>
          <td className={baseClasses}><pre>{product?.metadata?.access?.replaceAll('0',' ')}</pre></td>
          <td className={baseClasses}>
            {priceIdArray.includes(product.default_price.id) 
              ? <span className="text-green-500"> {product.default_price.id}</span> 
              : <span className="text-red-500"> {product.default_price.id}</span>}
           
          </td>
        </tr>)
        
      })}
      </tbody></table></div></div></div>
      
      {/* {productsLoading || productsError ? <p>debug..</p> :  <pre className='text-xs'>{JSON.stringify(products,null,2)}</pre>} */}
      
    </div></div>
  // }
}