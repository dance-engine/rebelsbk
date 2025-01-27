import React, { Suspense } from "react";
import Link from "next/link";
import { Container } from "../layout/container";
import { cn } from "../../lib/utils";
import { tinaField } from "tinacms/dist/react";
import NavItems from "./nav-items";
import NavMobile from "./nav-mobile";
import Logo from './logo'

const headerColor = {
  default:
    "text-black dark:text-white from-gray-50 to-white dark:from-gray-800 dark:to-gray-900",
  primary: {
    blue: "text-white from-blue-300 to-blue-500",
    teal: "text-white from-teal-400 to-teal-500",
    green: "text-white from-green-400 to-green-500",
    red: "text-white from-red-400 to-red-500",
    pink: "text-white from-pink-400 to-pink-500",
    purple: "text-white from-purple-400 to-purple-500",
    orange: "text-white from-orange-400 to-orange-500",
    yellow: "text-white from-yellow-400 to-yellow-500",
    merseyside: "text-white from-richblack-400 to-richblack-500",
    rebelsbk: "text-white dark:from-[#e83786] dark:to-[#b42a68]"
  },
};

export default function Header({header, theme}:any) {

  const headerColorCss =
    header.color === "primary"
      ? headerColor.primary[theme.color]
      : headerColor.default;
  
  return (
    <div
      className={`header relative overflow-hidden bg-gradient-to-b ${headerColorCss}`}
    >
      <Container size="custom" className="py-0 relative z-10 max-w-8xl">
        <div className="flex justify-between items-stretch gap-6">
          <h4 className="select-none text-lg font-bold tracking-tight my-0 transition duration-150 ease-out transform">
            <Link
              href="/"
              className="flex gap-1 items-center whitespace-nowrap tracking-[.002em]"
              
            >
              <Logo className="w-24 h-24" />
              {" "}
              <span data-tina-field={tinaField(header, "name")} className="ml-2 hidden xs:inline">
                
                {header.name.replace("2024", "")}
                <span className="hidden sm:inline md:hidden lg:inline">2024</span>
              </span>
            </Link>
          </h4>
          <Suspense>
            <NavItems navs={header.nav} />
          </Suspense>
          
          <NavMobile title={header.name} navs={header.nav} />

        </div>
        <div
          className={cn(
            `absolute h-[1px] bg-gradient-to-r from-transparent`,
            theme.darkMode === "primary"
              ? `via-white`
              : `via-black dark:via-white`,
            "to-transparent bottom-0 left-4 right-4 -z-1 opacity-20"
          )}
        />
        
      </Container>
    </div>
  );
}
