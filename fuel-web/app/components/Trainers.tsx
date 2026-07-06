export const Trainers = () => {
    const trainers = [
      {
        name: "Arjun",
        role: "Strength Coach",
        img: "https://images.unsplash.com/photo-1605296867424-35fc25c9212a",
      },
      {
        name: "Priya",
        role: "Fat Loss Specialist",
        img: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b",
      },
      {
        name: "Rahul",
        role: "Personal Trainer",
        img: "https://images.unsplash.com/photo-1594737625785-a6cbdabd333c",
      },
      {
        name: "Neha",
        role: "Nutrition Coach",
        img: "https://images.unsplash.com/photo-1599058917212-d750089bc07e",
      },
    ];
  
    return (
      <section className="bg-black py-16">
  
        {/* 🔥 Heading */}
        <div className="text-center mb-10">
          <p className="text-[12px] tracking-[0.6em] text-neutral-600 mb-4">
            TRAINERS
          </p>
  
          <h2 className="text-5xl  font-extrabold text-neutral-200">
            MEET YOUR COACHES
          </h2>
        </div>
  
        {/* 🔥 Horizontal strip */}
        <div className="flex gap-6 overflow-x-auto px-6 scrollbar-hide">
  
          {trainers.map((trainer, i) => (
            <div
              key={i}
              className="min-w-[200px] group"
            >
              {/* Image */}
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={`${trainer.img}?auto=format&fit=crop&w=400&q=80`}
                  className="w-full h-[260px] object-cover 
                             group-hover:scale-105 transition duration-500"
                  alt=""
                />
  
                {/* overlay */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition" />
              </div>
  
              {/* Info */}
              <div className="mt-3">
                <p className="text-white font-semibold">
                  {trainer.name}
                </p>
  
                <p className="text-neutral-400 text-sm">
                  {trainer.role}
                </p>
              </div>
            </div>
          ))}
  
        </div>
      </section>
    );
  };