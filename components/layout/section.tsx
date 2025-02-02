import React from "react";
import { useLayout } from "../layout/layout-context";

export const Section = ({ children, color = "", className = "" , backgroundImage = "" }) => {
  const { theme } = useLayout();
  const sectionColor = {
    default:
      "text-gray-800 dark:text-gray-50 bg-gradient-to-tl from-gray-50 dark:from-gray-900 via-transparent to-transparent",
    tint: "text-gray-900 dark:text-gray-100 bg-gradient-to-br from-gray-100 dark:from-gray-1000 to-transparent",
    primary: {
      blue: "text-white bg-blue-500 bg-gradient-to-br from-blue-500 to-blue-600",
      teal: "text-white bg-teal-500 bg-gradient-to-br from-teal-500 to-teal-600",
      green:
        "text-white bg-green-600 bg-gradient-to-br from-green-600 to-green-700",
      red: "text-white bg-red-500 bg-gradient-to-br from-red-500 to-red-600",
      pink: "text-white bg-pink-500 bg-gradient-to-br from-pink-500 to-pink-600",
      purple:
        "text-white bg-purple-500 bg-gradient-to-br from-purple-500 to-purple-600",
      orange:
        "text-white bg-orange-500 bg-gradient-to-br from-orange-500 to-orange-600",
      yellow:
        "text-white bg-richblack-500 bg-gradient-to-br from-richblack-500 to-yellow-600",
      merseyside:
        "text-white bg-richblack-500 bg-gradient-to-br from-richblack-500 to-richblack-600",
    },
    transparent: "text-gray-900 dark:text-gray-100",
  };
  const sectionColorCss =
    color === "primary"
      ? sectionColor.primary[theme.color]
      : sectionColor[color]
      ? sectionColor[color]
      : sectionColor.default;
  
  const videoMatcher = /.*\.mp4/
  const hasVideo = videoMatcher.test(backgroundImage)

  if (backgroundImage) {
    return hasVideo ? (
      <section
        className={`flex-1 relative transition duration-150 ease-out body-font overflow-hidden ${sectionColorCss} bg-none`}
      > 
        <video
          className="absolute inset-0 object-cover w-full h-full opacity-50"
          autoPlay
          muted
          loop
          playsInline
          style={{filter: 'blur(5px) grayscale(50%)'}}
        >
          <source src={backgroundImage} type="video/mp4" />
        </video>
        {children}
      </section>
    ) : (
      <section
        className={`flex-1 relative transition duration-150 ease-out body-font overflow-hidden ${sectionColorCss} ${className}`}
      > 
        <div
        className="absolute inset-0 bg-gradient-to-b bg-cover from-gray-50 to-transparent dark:from-gray-900 dark:to-transparent z-1 "
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundPositionX: '50%',
          backgroundPositionY: '20%',
          opacity: 0.7,
        }}
      />
      {children}
      </section>
    )
  } else {
    return (
      <section
        className={`flex-1 relative transition duration-150 ease-out body-font overflow-hidden ${sectionColorCss} ${className}`}
      > 
        {children}
      </section>
    )
  }
};
