import React, { useEffect } from 'react';

import './App.css';

import Template from './components/template';


// export default function App() {

//   useEffect(() => {
//     document.title = `Antoine Debouchage - Machine Learning, Quantum Computing, Mathematics - Personal Website`;
//   }, []);

//   return (
//     <Template>
//       <div className="text-center pt-20" style={{ zIndex: 10 }}>
//         <h1 className="text-5xl py-2 text-gray-100 font-semibold">Antoine Debouchage</h1>
//         <h4 className="text-2xl py-3 text-gray-200">
//           <span className="">Machine Learning</span>, Quantum Computing, Mathematics
//         </h4>
//         <br />
//         <br />
//         {/* <div className='text-left w-1/2 mx-auto'>
//           <p className="text-lg text-gray-300">
//             <span className="font-bold">Welcome</span> to my personal website. My name is Antoine Debouchage, I am a Master student at CentraleSupélec & Ecole Normale Supérieure Paris-Saclay. I am passionate about <span className="font-bold">Machine Learning</span>, Quantum Computing and Mathematics.
//           </p>
//         </div> */}
//       </div>
//     </Template>
//   );
// }

// import { Download, Mail, GitHub, Linkedin } from "lucide-react";

export default function App() {
  useEffect(() => {
    document.title = `Antoine Debouchage - Machine Learning, Quantum Computing, Mathematics - Personal Website`;
  }, []);

  return (
    <Template>
      <main className="relative z-10 flex flex-col items-center justify-center px-6 py-10 sm:py-32 lg:py-10">
        <div className="relative">
          <div className="mx-auto w-40 h-40 sm:w-52 sm:h-52 rounded-full overflow-hidden ring-4 ring-gray-900/30 shadow-xl bg-gradient-to-br from-white/5 via-white/3 to-white/2">
            <img
              src="/images/profile_picture.jpg"
              alt="Antoine Debouchage"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="absolute -right-14 -bottom-2 inline-flex items-center gap-2 rounded-full bg-gray-800/60 px-2 py-1 text-xs font-thin text-gray-200 backdrop-blur-md shadow-md whitespace-nowrap">
            <span className="hidden sm:inline">『井の中の蛙、大海を知らず。されど空の深さを知る』</span>
          </div>
        </div>

        <header className="mt-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-100 leading-tight">Antoine Debouchage</h1>
          <p className="mt-3 text-base sm:text-2xl text-gray-200">
            Financial Mathematics · Machine Learning · Quantum Computing
          </p>
        </header>

        <section className="mt-10 max-w-2xl text-center text-sm text-gray-300 leading-relaxed">
          <p>
            I am a <span className="font-semibold text-gray-100">PhD student in Financial Mathematics</span> (CIFRE) with <a href="https://www.barclays.com/" className="text-orange-300 hover:text-orange-400">Barclays</a> and <a href="http://www.math-evry.cnrs.fr/doku.php" className="text-orange-300 hover:text-orange-400">LaMME</a>,
            working on Statistical Learning for Quantitative Finance. 
            Before my PhD, I completed a <span className="font-semibold text-gray-100">Master degree in Engineering</span> at <a href="https://www.centralesupelec.fr/" className="text-orange-300 hover:text-orange-400">CentraleSupélec</a> in Mathematics and Data Science, 
            and the <a href="https://www.master-mva.com/" className="text-orange-300 hover:text-orange-400"><span className="font-semibold text-gray-100">MVA Master of Research</span></a> at <a href="https://www.ens-paris-saclay.fr/" className="text-orange-300 hover:text-orange-400">ENS Paris-Saclay</a>.
          </p>
        </section>

        {/* Expertise chips */}
        {/* <div className="mt-8 flex flex-wrap justify-center gap-3">
          {[
            "Research",
            "Deep Learning",
            "Mathematics",
            "Finance",
            "Quantum Computing",
            "Tensor Networks",
          ].map((expertise) => (
            <span
              key={expertise}
              className="inline-flex items-center px-4 py-1.5 rounded-full 
                        bg-gradient-to-r from-blue-900/40 to-indigo-800/30 
                        text-xs text-gray-100 font-light 
                        border border-white/10 shadow-sm 
                        backdrop-blur-sm hover:scale-105 hover:from-blue-800/50 
                        hover:to-indigo-700/40 transition-transform duration-200"
            >
              {expertise}
            </span>
          ))}
        </div> */}
      </main>
    </Template>
  );
}
