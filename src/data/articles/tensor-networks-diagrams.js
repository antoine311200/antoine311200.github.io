import Paragraph from '../../components/helper';

const article1 = {
  title: 'Introduction to Tensor Networks and Diagrams',
  date: '25 September 2023',
  description: 'A great product for your needs.',
  keywords: ['Mathematics', 'Tensor networks', 'Quantum computing'],
  content: [
    {
      id: 'introduction',
      title: 'Introduction',
      content: (
        <span>
          <p className="my-4" />
          <Paragraph>When dealing with complex tensors, things can get messy fast as to mathematical notations. Imagine you're somehow unfamiliar with covariants, contravariants tensor and tensor contractions: you are trying to learn new algorithms (especially in the field of quantum computing) and you stumble across a website or paper bombarding you with awful equations. I think that you would give up on the explanation quite fast.</Paragraph>
          <Paragraph>In this notebook, I present a basic introduction to Einstein notation and tensor diagram that will help you grasp the concept of tensor contraction that you can see in your everyday life as a data scientist (think about a batch of images: that's a 3-order tensor).</Paragraph>
        </span>
      )
    }
  ]
  //   id: 'section1',
  //   title: 'Section 1',
  //   content: 'Content of Section 1',
  //   subsections: [
  //     {
  //       id: 'subsection1-1',
  //       title: 'Subsection 1.1',
  //       content: (
  //         <div>
  //           <p className="mt-4">When dealing with complex tensors, things can get messy fast as to mathematical notations. Imagine you're somehow unfamiliar with covariants, contravariants tensor and tensor contractions: you are trying to learn new algorithms (especially in the field of quantum computing) and you stumble across a website or paper bombarding you with awful equations. I think that you would give up on the explanation quite fast.</p>
  //           <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
  //           <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
  //           <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
  //         </div>
  //       ),
  //       subsections: [
  //         {
  //           id: 'subsection1-1-1',
  //           title: 'Subsection 1.1.1',
  //           content: (
  //             <div>
  //               <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
  //               <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
  //               <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
  //               <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
  //             </div>
  //           ),
  //         },
  //       ],
  //     },
  //   ]
  // },
  // {
  //   id: 'section2',
  //   title: 'Section 2',
  //   content: 'Content of Section 2',
  // },
  // {
  //   id: 'section3',
  //   title: 'Section 3',
  //   content: (
  //     <div>
  //       <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
  //       <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
  //       <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
  //       <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
  //     </div>
  //   ),
  // }]
};

export default article1;