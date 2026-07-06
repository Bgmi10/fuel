"use client";

import Marquee from "react-fast-marquee";
const testimonials = [
    {
      name: "Arjun Kumar",
      role: "Software Engineer",
      avatar: "https://i.pravatar.cc/150?img=11",
      text: "I lost 10kg in 3 months at Fuel Gym. The trainers actually push you beyond your limits.",
    },
    {
      name: "Priya Sharma",
      role: "HR Manager",
      avatar: "https://i.pravatar.cc/150?img=32",
      text: "Fuel Gym changed my lifestyle. The strength training + diet plan made everything simple.",
    },
    {
      name: "Rahul Mehta",
      role: "Student",
      avatar: "https://i.pravatar.cc/150?img=22",
      text: "Best gym in the city. Clean equipment, motivating trainers, and real results.",
    },
    {
      name: "Neha Iyer",
      role: "Marketing Lead",
      avatar: "https://i.pravatar.cc/150?img=47",
      text: "The group classes are insane. I never thought fitness could be this fun.",
    },
    {
      name: "Vikram Singh",
      role: "Entrepreneur",
      avatar: "https://i.pravatar.cc/150?img=15",
      text: "Fuel Gym is not just workouts — it's discipline, consistency, and transformation.",
    },
  ];

const Card = ({ t }: any) => (
    <div
      className="mx-4 w-[340px] min-h-[200px] bg-neutral-900 border border-neutral-800 
                 rounded-2xl p-6 transition duration-300
                 "
    >
      {/* Avatar + Name */}
      <div className="flex items-center gap-3 mb-4">
        <img
          src={t.avatar}
          alt={t.name}
          className="w-10 h-10 rounded-full object-cover border border-neutral-700"
        />
  
        <div>
          <p className="text-white font-semibold text-sm">{t.name}</p>
          <p className="text-neutral-500 text-xs">{t.role}</p>
        </div>
      </div>
  
      {/* Quote */}
      <p className="text-neutral-300 text-sm leading-relaxed">
        “{t.text}”
      </p>
    </div>
  );

export const Testimonials = () => {
  return (
    <section className="bg-black py-24 px-6 relative overflow-hidden">

      {/* Heading */}
      <div className="text-center mb-16">
        <p className="text-[12px] tracking-[0.6em] text-neutral-600 mb-2">
          TESTIMONIALS
        </p>

        <h2 className="text-4xl md:text-5xl font-extrabold text-neutral-200">
          WHAT OUR MEMBERS SAY
        </h2>
      </div>

      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />

      {/* Top row */}
      <div className="flex items-center">

      <Marquee speed={50} pauseOnHover gradient={false}>
        {testimonials.map((t, i) => (
          <Card key={i} t={t} />
        ))}
      </Marquee>

      </div>

    </section>
  );
};