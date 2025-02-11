"use client";
import { usePathname } from "next/navigation";
import React from "react";
import NavActive from "./nav-active";
import { tinaField } from "tinacms/dist/react";
import Link from "next/link";
import { useLayout } from "../layout/layout-context";
import { useSearchParams } from 'next/navigation'
// import { CartIcon } from "./checkout-icon";

const activeItemClasses = {
  blue: "border-b-3 border-blue-200 text-blue-700 dark:text-blue-300 font-medium dark:border-blue-700",
  teal: "border-b-3 border-teal-200 text-teal-700 dark:text-teal-300 font-medium dark:border-teal-700",
  green:
    "border-b-3 border-green-200 text-green-700 dark:text-green-300 font-medium dark:border-green-700",
  red: "border-b-3 border-red-300 text-red-700 dark:text-green-300 font-medium dark:border-red-700",
  pink: "border-b-3 border-pink-200 text-pink-700 dark:text-pink-300 font-medium dark:border-pink-700",
  purple:
    "border-b-3 border-purple-200 text-purple-700 dark:text-purple-300 font-medium dark:border-purple-700",
  orange:
    "border-b-3 border-orange-200 text-orange-700 dark:text-orange-300 font-medium dark:border-orange-700",
  yellow:
    "border-b-3 border-yellow-300 text-yellow-700 dark:text-yellow-300 font-medium dark:border-yellow-600",
  merseyside: 
    "border-b-3 border-yellow-300 text-yellow-700 dark:text-yellow-300 font-medium dark:border-yellow-600"
};

const activeBackgroundClasses = {
  blue: "text-blue-500",
  teal: "text-teal-500",
  green: "text-green-500",
  red: "text-red-500",
  pink: "text-pink-500",
  purple: "text-purple-500",
  orange: "text-orange-500",
  yellow: "text-yellow-500",
  merseyside: "text-yellow-500"
};

export default function NavItems({ navs }: { navs: any }) {
  const currentPath = usePathname();
  const { theme } = useLayout();
  const searchParams = useSearchParams()
  const draft = searchParams.get('draft')
  const filteredNavs = draft ? navs : navs.filter((item)=>{return item.visible})
  return (
    <>
      {draft ? (<a className="block text-xs bg-chillired-800 text-white w-96 text-center rounded-b-md absolute right-0 z-50" href="/">Currently showing Draft Content, Click to Hide</a>) : null}
      <ul suppressHydrationWarning className="gap-2 sm:gap-4 lg:gap-6 tracking-[.002em] -mx-4 hidden md:flex items-stretch">
        
        {filteredNavs.map((item) => {
          return (
            <li
              key={item.href}
              data-hidden={item.visible || "false"}
              className={
                currentPath === `/${item.href}`
                  ? activeItemClasses[theme.color]
                  : ""
              }
            >
              <Link
                data-tina-field={tinaField(item, "label")} 
                href={`${item.href}${draft ? "?draft=yup" : ''}`}
                className={`${!item.visible ? "text-gray-400" : null} relative select-none hover:text-gold-400	text-base inline-block tracking-wide transition duration-150 ease-out hover:opacity-100 py-8 px-1 lg:px-4 whitespace-nowrap`}
              >
                {item.label}
                {currentPath === `/${item.href}` && (
                  <NavActive
                    backgroundColor={activeBackgroundClasses[theme.color]}
                  />
                )}
              </Link>
            </li>
          );
        })}
        {/* <li suppressHydrationWarning>
          <CartIcon />
        </li> */}
        
      </ul>
    </>
  );
}
