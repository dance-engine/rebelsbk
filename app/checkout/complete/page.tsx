import Layout from "@components/layout/layout";
import {Container} from "@components/layout/container"
import {Icon} from "@components/icon"

export default function CheckoutPage() {
  return (
    <Layout>
      <Container size="small" width="small" className=" text-white w-full rounded-3xl border border-richblack-700 bg-richblack-500 pb-6">
        
        <h2 className="text-xl flex items-center -ml-14 mt-6">
          <Icon data={{name: "BiUser", color: "blue", style: "circle", size: "medium"}} className="mr-2 border border-richblack-700"></Icon>
          Checkout Complete
        </h2>
        <p className="text-base">You ticket have been emailed to you</p>
        <div className="flex pt-6"><a href="/" className="block py-2 px-4 bg-blue-500 text-white rounded-lg font-semibold shadow-sm" >Back to Homepage</a></div>
      </Container>
    </Layout>
  );
}
