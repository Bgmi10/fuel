"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

type Props = {
  before: string;
  after: string;
  name: string;
  result: string;
};

const TransformationCard = ({ before, after, name, result }: Props) => {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // reveal after image
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.2, 0.6, 1]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);

  return (
    <div
      ref={ref}
      className="relative w-full max-w-md h-[400px] overflow-hidden rounded-xl"
    >
      {/* BEFORE */}
      <img
        src={before}
        className="absolute inset-0 w-full h-full object-cover"
        alt=""
      />

      {/* AFTER (motion controlled) */}
      <motion.img
        src={after}
        style={{ opacity, scale }}
        className="absolute inset-0 w-full h-full object-cover"
        alt=""
      />

      {/* Label */}
      <div className="absolute top-4 left-4 bg-black/70 text-white text-xs px-3 py-1 rounded">
        BEFORE → AFTER
      </div>

      {/* Info */}
      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 to-transparent">
        <p className="text-white font-semibold">{name}</p>
        <p className="text-neutral-300 text-sm">{result}</p>
      </div>
    </div>
  );
};
export const Transformations = () => {
    return (
      <section className="bg-black py-24 px-6 flex flex-col items-center">
  
        <div className="text-center mb-16 max-w-2xl">
          <p className="text-xs tracking-[0.5em] text-neutral-500 mb-4">
            REAL RESULTS
          </p>
  
          <h2 className="text-3xl md:text-5xl font-extrabold text-white">
            TRANSFORMATIONS THAT SPEAK
          </h2>
  
          <p className="mt-4 text-neutral-400">
            Real people. Real consistency. Real results.
          </p>
        </div>
  
        <div className="grid md:grid-cols-3 gap-8">
          <TransformationCard
            before="https://cdn-images.cure.fit/www-curefit-com/image/upload/w_630,q_auto:good,f_auto,dpr_2,fl_progressive/image/test/image_zoom_widget/image_zoom_widget_img_1.png"
            after="https://cdn-images.cure.fit/www-curefit-com/image/upload/w_630,q_auto:good,f_auto,dpr_2,fl_progressive/image/test/image_zoom_widget/image_zoom_widget_img_2.png"
            name="Rahul K"
            result="Lost 12kg in 4 months"
          />
  
          <TransformationCard
            before="https://cdn-images.cure.fit/www-curefit-com/image/upload/w_630,q_auto:good,f_auto,dpr_2,fl_progressive/image/test/image_zoom_widget/image_zoom_widget_img_1.png"
            after="https://cdn-images.cure.fit/www-curefit-com/image/upload/w_630,q_auto:good,f_auto,dpr_2,fl_progressive/image/test/image_zoom_widget/image_zoom_widget_img_2.png"
            name="Priya S"
            result="Fat loss + muscle tone"
          />
  
          <TransformationCard
            before="https://cdn-images.cure.fit/www-curefit-com/image/upload/w_630,q_auto:good,f_auto,dpr_2,fl_progressive/image/test/image_zoom_widget/image_zoom_widget_img_1.png"
            after="https://cdn-images.cure.fit/www-curefit-com/image/upload/w_630,q_auto:good,f_auto,dpr_2,fl_progressive/image/test/image_zoom_widget/image_zoom_widget_img_2.png"
            name="Arjun M"
            result="Body recomposition in 6 months"
          />
        </div>
      </section>
    );
  };