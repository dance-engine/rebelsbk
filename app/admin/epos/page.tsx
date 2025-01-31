import React from "react";
import Layout from "@components/layout/layout";
import { Container } from "@components/layout/container";
import Navigation from "@components/admin/navigation";
// import { currentUser } from "@clerk/nextjs/server";
// import Till from "@components/admin/till";

const pages = [
  { name: 'Admin', href: '/admin', current: true },
  { name: 'EPOS', href: '/admin/epos', current: true },
]

export default async function AdminUserPage() {


  // const loggedInUser = await currentUser();

  return (<Layout>
    <section className={`flex-1 relative transition duration-150 ease-out body-font overflow-hidden bg-none text-white`}>
      {" "}
      <Container width="large" padding="tight" className={`flex-1 pb-2`} size="top">
        <Navigation pages={pages} />
      </Container>        
      <Container width="large" padding="tight" className={`flex-1 pb-2`} size="none">
        Missing
        {/* <Till/> */}
      </Container>
    </section>
  </Layout>
);
}
