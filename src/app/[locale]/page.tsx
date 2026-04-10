"use client";

import Hero from "@/components/home/Hero";
import ImpactStats from "@/components/home/ImpactStats";
import LegacyTimeline from "@/components/home/LegacyTimeline";
import SchoolSpotlight from "@/components/home/SchoolSpotlight";
import SupportGrid from "@/components/home/SupportGrid";
import Testimonial from "@/components/home/Testimonial";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ImpactStats />
      <SupportGrid />
      <SchoolSpotlight />
      <Testimonial />
      <LegacyTimeline />
    </>
  );
}
