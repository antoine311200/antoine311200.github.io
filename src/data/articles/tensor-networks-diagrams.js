import React from 'react';
import { Paragraph, Remark, Image } from '../../components/helper';
// import ReactMarkdown from 'react-markdown';

const article1 = {
  title: 'Introduction to Tensor Networks Diagrams & Einstein Notation',
  date: '25 September 2023',
  description: 'A short introduction to tensor networks and diagrams. This article introduces Einstein notation and tensor diagrams laying the foundation for tensor-inspired quantum algorithms and many-body physics.',
  keywords: ['Mathematics', 'Tensor networks', 'Quantum computing'],
  imagePath: '/images/tensor-networks-diagram/banner.PNG',
  content: [
    {
      id: 'introduction',
      title: 'Introduction',
      content: (
        <span>
          <p className="my-4" />
          <Paragraph>When dealing with complex tensors, the use of mathematical notations can quickly become overwhelming. Consider a scenario where you're not well-acquainted with covariant and contravariant tensors, as well as tensor contractions. You're attempting to learn new algorithms, particularly in the realm of quantum computing, and you stumble upon a website or paper inundating you with daunting equations. Under such circumstances, it's likely that you would give up on understanding the explanation fairly swiftly.</Paragraph>
          <Paragraph>In this article, I aim to provide a basic introduction to Einstein notation and tensor diagrams, which will aid you in understanding the concept of tensor contractions. You'll find that this knowledge is highly applicable in your daily life as a data scientist – just think about a batch of images, which can be represented as a 3rd-order tensor.</Paragraph>

          <Remark>Please note that we won't delve too deeply into the covariant and contravariant aspects of tensors. Therefore, our approach may not be entirely rigorous, as I'll occasionally use up/down indices to represent input and output indices of operators.</Remark>
          <Paragraph>By the end of this concise tutorial, you'll have the ability to comprehend most common diagrams like the one depicted below. You'll also gain a solid understanding of Einstein notation, which can prove invaluable when creating custom layers in TensorFlow or PyTorch.</Paragraph>

          <Image src="\images\tensor-networks-diagram\tensor_0.PNG" />
          <Image src="\images\tensor-networks-diagram\tensor_00.PNG" caption="Matrix Product State" />
        </span>
      )
    },
    {
      id: "einstein-notation",
      title: "Einstein notation",
      content: (
        <span>
          <Paragraph>{`Einstein notation is a  notational convention aiming to shorten the length of equations when dealing with tensors.
            The basic concept is to remove the summation symbol ($\\sum$): when two indices are the same in an expression, it implies a summation.
            Another point is to express a tensor only by its element for any indices (i.e $v_j$ for a tensor, $M_{ij}$ for a matrix...).`}</Paragraph>
          <Paragraph>Let's jump to examples:</Paragraph>

          <Paragraph><strong>Example 1:</strong></Paragraph>
          <Paragraph>{`Let $A \\in \\mathcal{M}_{n \\times p}(\\mathbb{R})$, we know that you can write the matrix $A$ as the set of its elements $(A_{ij})_{i \\in \\{1,\\cdots,n\\}, j \\in \\{1,\\dots,p\\}}$.
            Using Einstein notation, when refering to the matrix $A$, you just write $A_{ij}$ (assuming it is for any $i \\in \\{1,\\cdots,n\\}$ and $j \\in \\{1,\\dots,p\\}$)
            $$A \\longrightarrow A_{ij}$$`}</Paragraph>
          <Paragraph>{`For a vector $v = (v_i) \\in \\mathbb{R}^n$, the same way as before we represent this vector as $v_i$.`}</Paragraph>
          <Image src="\images\tensor-networks-diagram\tensor_1.jpg" caption="Einstein notation (1)" />

          <Paragraph><strong>Example 2:</strong></Paragraph>
          <Paragraph>{`Let's remove those summation symbols! \\n
            Let $x$ and $y$ be two vectors in (let's say) $\\mathbb{R}^n$, if we want to compute the inner product (scalar product) of $x$ and $y$, we would write  
            $$\\langle x | y \\rangle = x \\cdot y = x^\\intercal y = \\sum_{i = 1}^n x_i y_i$$
            We can see that we perform a summation over the index $i$ (and that it is present in both $x$ and $y$ inside the sum. Hence, we can delete this sum (as it is implied that we are summing along the $i$ axis) :
            $$\\langle x | y \\rangle = x^\\intercal y = x \\cdot y = x_i y_i$$

            The same way given two matrix $A \\in \\mathcal{M}_{n \\times p}(\\mathbb{R})$ and $B \\in \\mathcal{M}_{p \\times q}(\\mathbb{R})$, the product $C=AB=\\sum_{j=1}^p A_{ij}B_{jk}$ can be written in Einstein notation as 
            $$C_{ik} = A_{ij} B_{jk}$$
          `}</Paragraph>
          <Image src="\images\tensor-networks-diagram\tensor_2.jpg" caption="Einstein notation (2)" />

          <Paragraph><strong>Example 3:</strong></Paragraph>
          <Paragraph>{`One last example (a bit more complex). \\n
          Let $T$ be a $2N$-order tensor with indices $s_1,\\cdots,s_N$ and $r_1,\\cdots,r_N$ emerging from the contraction along $\\alpha$ and $\\beta$ indices of all the $G$ tensors (for simplification purpose all tensors have the same name $G$ but it should be $G_1,\\cdots,G_N$).
          `}</Paragraph>
          <Image src="\images\tensor-networks-diagram\tensor_3.PNG" caption="More complex example of Einstein notation" />
        </span>
      )
    },
    {
      id: "tensor-diagram",
      title: "Penrose tensor diagram",
      content: (
        <span>
          <Paragraph>{`The last example of the previous paragraph may seem a bit abstract don't you think! In this section, we will introduce "tensor diagrams" which aim at visualizing easily tensor contractions. In the rest of this notebook, we will be using Einstein notation. \\n\\n
          A tensor corresponds to a (labelled) shape such as a circle, rectangle, diamond with one or more output legs. Those legs represent the indices of the tensor. For instance, a vector that only has one index will be represented as a circle with one leg (potentially labelled with the name of the index). A matrix has two indices (rows and columns) and thus will be a circle with two output legs. For $N$-order tensor, you follow just the same pattern as before. \\n\\n
          `}</Paragraph>
          <Paragraph type="remark">{`In books/papers using these tensor diagrams, authors tend to represent the covariant tensors with indices below and contravariant with indices above i.e $w_i = A_i^j v_j$ with the example above.`}</Paragraph>

        </span>
      ),
      subsections: [
        {
          id: "basic-diagram",
          title: "Basic diagram",
          content: (
            <span>
              <Paragraph>{`The basic elements of linear algebra (vectors, matrix...) can be represented as below :`}</Paragraph>
              <Image src="\images\tensor-networks-diagram\tensor_4.PNG" caption="Basic diagram for vector, matric and order 3 tensor" />

            </span>
          ),
        },
        {
          id: "tensor-contraction",
          title: "Tensor contractions",
          content: (
            <span>
              <Paragraph>{`How to represent a matrix multiplication using those diagrams? And what about the $2N$-order tensor described hereinabove? \\n\\n
              The answer is simple : connecting two tensor legs with a wire implies that the corresponding indices are contracted. \\n\\n
              In the first example in the following figure, two tensors $M_i^{kj}$ and $N_{kj}^l$ are contracted along the axis $k$ and $j$. The resulting tensor is an order 2 tensor $P_i^l$. \\n\\n`}
              </Paragraph>
              <Image src="\images\tensor-networks-diagram\tensor_5.PNG" caption="Basic diagram for tensor contractions" />
              <Paragraph>{`Let's dive into the diagram of the $2N$-order tensor! \\n\\n
            Here, $N$ tensors of order $4$ (the extremities) and $6$ are contracted in a chain-like fashion alogn the $\\alpha$'s and $\\beta$'s axis resulting in a $2N$ order tensor.`}</Paragraph>
              <Image src="\images\tensor-networks-diagram\tensor_6.PNG" caption="More complex tensor contractions from the example 3 of Einstein notation" />

            </span>
          ),
        },
        {
          id: "juxtaposition",
          title: "Juxtaposition and tensor product",
          content: (
            <span>
              <Paragraph>{`When two or more tensors are drawn disconnected to each other in the same diagram, it means that they are multiplied together with a tensor product.`}</Paragraph>
              <Image src="\images\tensor-networks-diagram\tensor_7.PNG" caption="Juxtaposition of tensors to represent a tensor product" />
              {/* <Image src="\images\tensor-networks-diagram\tensor_8.PNG" caption="One can play to distort the diagram, basic linear algebra shows the isomorphic characteristic of such diagrams" /> */}
            </span>
          ),
        },
        {
          id: "transposition",
          title: "Transposition",
          content: (
            <span>
              One can represent a transposition simply by inverting the legs.
              <Image src="\images\tensor-networks-diagram\tensor_9.PNG" caption="Transposition of tensors" />
            </span>
          ),
        },
        {
          id: "trace",
          title: "Trace",
          content: (
            <span>
              The trace of an operator is given by connecting the input legs to the corresponding output legs as follow
              <Image src="\images\tensor-networks-diagram\tensor_10.PNG" caption="Trace of tensors" />

            </span>
          ),
        },
        {
          id: "example-svd",
          title: "Example : Singular Value Decomposition",
          content: (
            <span>
              <Paragraph>{`A diagram that you will often come across is the SVD diagram. It has nothing more exotic than the other diagrams we've just seen but it is very important.
              Let $A$ be a matrix one can show that $A$ can be decomposed as $A=USV^*$ with $U$ and $V$ orthogonal matrices and $S$ a rectangular diagonal matrix with non-negative real numbers on the diagonal corresponding to the singular value of the matrix $A$. \\n\\n
              A diagram for this operation can be :`}
              </Paragraph>
              <Image src="\images\tensor-networks-diagram\tensor_11.PNG" caption="Tensor diagram of a Singular Value Decomposition" />

            </span>
          ),
        }
      ]
    },
    {
      id: "conclusion",
      title: "Conclusion",
      content: (
        <span>
          <Paragraph>Tensor diagrams and Einstein notations are very helpful when you are trying to picture contractions of elaborated tensors. Using a sheet of paper, you can understand in no time how to perform your calculation. \n\n
            Though tensor diagrams are not exactly theorised and depending on the author things can change a bit but it won't be much of a problem to adapt. \n\n
            (In <strong>quantum computing</strong>, a quantum circuit is nothing more than a complex tensor diagram.) </Paragraph>
          <Image src="\images\tensor-networks-diagram\tensor_12.PNG" caption="Quantum circuit diagrams are tensor diagrams" />
          <br />
          <br />
          <br />
          I hope you enjoyed this little introduction to tensor networks and diagrams. If you have any questions, feel free to contact me.
        </span>
      ),
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