'use client'

import React, { Suspense, useState } from "react";
import Link from "next/link";
import NavMobileItems from "./nav-mobile-items";
import Logo from './logo'
import { Dialog, DialogPanel } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

export default function NavMobile({ title, navs }: { title: string, navs: any}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <button 
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-150 hover:text-white md:hidden "
      >
        <span className="sr-only">Open main menu</span>
        <Bars3Icon aria-hidden="true" className="h-6 w-6" />
      </button>

      <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="2xl:hidden border-l-chillired-300">
        <div className="fixed inset-0 z-10" />
        <DialogPanel className="shadow-2xl shadow-black  fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-richblack-500 px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="flex items-center justify-between">
            <a href="#" className="-m-1.5 p-1.5">
              <span className="sr-only">{title}</span>
              <Link href='/'><Logo className="w-12 h-12"></Logo></Link>
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="-m-2.5 rounded-md p-2.5 text-gray-700"
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon aria-hidden="true" className="h-6 w-6" />
            </button>
          </div>
          <Suspense>
            <NavMobileItems navs={navs} />
          </Suspense>
        </DialogPanel>
      </Dialog>
    </>
  )
}

