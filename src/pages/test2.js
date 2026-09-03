import React from 'react';

const Test2 = () => {
  return (
    <div className="flex flex-col lg:flex-row justify-between bg-gray-900 text-white p-10 gap-4">
      <div className="lg:w-1/2 space-x-2">
        <h2 className="text-3xl font-bold mb-6">Education</h2>
        <div className="relative border-l-2 border-gray-700 pl-[1.95em]">
          <div className="mb-8 relative group">
            <div className="absolute -left-10  w-4 h-4 bg-gray-900 border-2 border-gray-700 rounded-full"></div>
            <h3 className="text-xl font-semibold group-hover:text-white transition-colors duration-300">Master in Design</h3>
            <p className="text-gray-400 group-hover:text-white transition-colors duration-300">Cambridge University / 2010 - 2014</p>
            <p className="text-gray-400 mt-2 group-hover:text-white transition-colors duration-300">Eu nulla at mauris cursus consectetur posuere iaculis ipsum neque. Morbi felis pellentesque ligula sed dictumst.</p>
          </div>
          <div className="mb-8 relative group">
          <div className="absolute -left-10  w-4 h-4 bg-gray-900 border-2 border-gray-700 rounded-full"></div>
          <h3 className="text-xl font-semibold group-hover:text-white transition-colors duration-300">Bachelor in Science</h3>
            <p className="text-gray-400 group-hover:text-white transition-colors duration-300">Cambridge University / 2014 - 2016</p>
            <p className="text-gray-400 mt-2 group-hover:text-white transition-colors duration-300">Porttitor euismod at semper ut massa. Lorem varius magna volutpat nunc. Et faucibus scelerisque donec eleifend.</p>
          </div>
          <div className="relative group">
          <div className="absolute -left-10  w-4 h-4 bg-gray-900 border-2 border-gray-700 rounded-full"></div>
          <h3 className="text-xl font-semibold group-hover:text-white transition-colors duration-300">Diploma in Computer</h3>
            <p className="text-gray-400 group-hover:text-white transition-colors duration-300">Cambridge University / 2016 - 2018</p>
            <p className="text-gray-400 mt-2 group-hover:text-white transition-colors duration-300">Adipiscing sed magna tempus arcu morbi. Ipsum pellentesque lorem suscipit in. Hendrerit rhoncus quis tempor urna.</p>
          </div>
        </div>
      </div>

      <div className="lg:w-1/2 mt-10 lg:mt-0 space-x-2">
        <h2 className="text-3xl font-bold mb-6">Experience</h2>
        <div className="relative border-l-2 border-gray-700 pl-8">
          <div className="mb-8 relative group">
          <div className="absolute -left-10  w-4 h-4 bg-gray-900 border-2 border-gray-700 rounded-full"></div>
          <h3 className="text-xl font-semibold group-hover:text-white transition-colors duration-300">Lead Design & Development</h3>
            <p className="text-gray-400 group-hover:text-white transition-colors duration-300">Envato / 2020 - Current</p>
            <p className="text-gray-400 mt-2 group-hover:text-white transition-colors duration-300">Ipsum erat duis leo lectus tellus neque dictumst. Dignissim tortor quis nisl mi lectus facilisis ac eget.</p>
          </div>
          <div className="mb-8 relative group">
          <div className="absolute -left-10  w-4 h-4 bg-gray-900 border-2 border-gray-700 rounded-full"></div>
          <h3 className="text-xl font-semibold group-hover:text-white transition-colors duration-300">Senior Design & Development</h3>
            <p className="text-gray-400 group-hover:text-white transition-colors duration-300">Apple / 2019 - 2020</p>
            <p className="text-gray-400 mt-2 group-hover:text-white transition-colors duration-300">Congue dolor gravida eu tristique netus posuere dolor. Penatibus imperdiet egestas ut sit scelerisque sapien a.</p>
          </div>
          <div className="relative group">
          <div className="absolute -left-10  w-4 h-4 bg-gray-900 border-2 border-gray-700 rounded-full"></div>
          <h3 className="text-xl font-semibold group-hover:text-white transition-colors duration-300">Junior Design & Development</h3>
            <p className="text-gray-400 group-hover:text-white transition-colors duration-300">Twitter / 2018 - 2019</p>
            <p className="text-gray-400 mt-2 group-hover:text-white transition-colors duration-300">Aliquet at interdum pellentesque non fringilla eget orci suspendisse. A iaculis augue vitae ultricies fusce sit.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Test2;
