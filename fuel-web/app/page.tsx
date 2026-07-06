'use client';

import { Hero } from "./components/Hero";
import { Header } from "./components/Header";
import { Pricing } from "./components/Pricing";
import { Services } from "./components/Services";
import { Trainers } from "./components/Trainers";
import { Testimonials } from "./components/Testimonials";
import { useState } from "react";
import { BookTrialForm } from "./components/BookTrialForm";
import { ContactForm } from "./components/Contactus";
import About from "./components/About";
import Footer from "./components/Footer";

export default function Home() {
  const [isContactOpen, setIsContactOpen  ] = useState(false);
  const [isBookTrailOpen, setIsBookTrailOpen] = useState(false);

  return (
    <div className="">
     
      <Header setIsContactOpen={setIsContactOpen} />
      <Hero setIsBookTrailOpen={setIsBookTrailOpen} />
      <About />
      {/* <Transformations /> */}
      <Services />
      <Trainers />
      <Pricing />
      <Testimonials />
 
      {
        isBookTrailOpen && <BookTrialForm open={isBookTrailOpen} setOpen={setIsBookTrailOpen} />
      }

<ContactForm open={isContactOpen} setOpen={setIsContactOpen} />
    <Footer />
    </div>
  );
}
