import React, { useState, useEffect } from 'react';
import Template from '../components/template';
import Markdown from '../components/markdown';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const DUMMY_ARTICLE = [
  {
    id: 'section1',
    title: 'Section 1',
    content: 'Content of Section 1',
    subsections: [
      {
        id: 'subsection1-1',
        title: 'Subsection 1.1',
        content: (
          <div>
            <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
            <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
            <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
            <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
          </div>
        ),
        subsections: [
          {
            id: 'subsection1-1-1',
            title: 'Subsection 1.1.1',
            content: (
              <div>
                <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
                <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
                <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
                <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
              </div>
            ),
          },
        ],
      },
    ],
  },
  {
    id: 'section2',
    title: 'Section 2',
    content: 'Content of Section 2',
  },
  {
    id: 'section3',
    title: 'Section 3',
    content: (
      <div>
        <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
        <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
        <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
        <p className="mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Cursus turpis massa tincidunt dui ut ornare. Vitae elementum curabitur vitae nunc. Luctus accumsan tortor posuere ac ut. Mauris vitae ultricies leo integer malesuada. Eget aliquet nibh praesent tristique magna sit amet purus gravida. Dolor sed viverra ipsum nunc aliquet bibendum enim facilisis gravida. Iaculis at erat pellentesque adipiscing commodo elit at imperdiet dui. Id neque aliquam vestibulum morbi blandit cursus risus. Dolor sit amet consectetur adipiscing elit. Consequat id porta nibh venenatis. Laoreet id donec ultrices tincidunt. Eu sem integer vitae justo eget magna. Morbi tristique senectus et netus et malesuada fames ac. Arcu ac tortor dignissim convallis aenean. Amet justo donec enim diam.</p>
      </div>
    ),
  },
];

function Article(articleContent = DUMMY_ARTICLE) {
  // Sample content with sections, subsections, and subsubsections

  const [activeSection, setActiveSection] = useState(null);

  const handleSectionClick = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const sectionIds = [];

      const processSections = (sections) => {
        for (const section of sections) {
          sectionIds.push(section.id);
          if (section.subsections) {
            processSections(section.subsections);
          }
          if (section.subsubsections) {
            sectionIds.push(...section.subsubsections.map((subsubsection) => subsubsection.id));
          }
        }
      };

      processSections(articleContent);

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const element = document.getElementById(sectionIds[i]);
        if (element && scrollPosition >= element.offsetTop - 100) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);



  const renderSections = (sections) => {
    return sections.map((section) => (
      <section key={section.id} id={section.id} className="mb-6">
        <h2 className="text-2xl font-semibold">{section.title}</h2>
        <p>{section.content}</p>
        {section.subsections && renderSections(section.subsections)}
      </section>
    ));
  };

  const renderTableOfContents = (sections, depth) => {
    return (
      <ul className='ml-2'>
        {sections.map((section) => (
          <li key={section.id} style={
            {
              fontSize: `${16 - depth * 2}px`,
            }
          }>
            <a
              className={`cursor-pointer ${activeSection === section.id ? 'font-semibold' : ''
                }`}
              onClick={() => handleSectionClick(section.id)}
            >
              {section.title}
            </a>
            {section.subsections && renderTableOfContents(section.subsections, depth + 1)}
          </li>
        ))}
      </ul>
    );
  };


  return (

    <Template iconColor="black">
      <main className="flex-grow container mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-semibold">Blog Title</h1>
          <p className="text-gray-600">Posted on September 21, 2023</p>
          <hr className="mb-4" />

          <div className="lg:w-1/4 lg:ml-4 fixed right-0">
            <div className="sticky top-16">
              <h2 className="text-xl font-semibold mb-2">Table of Contents</h2>
              {renderTableOfContents(articleContent, 0)}
            </div>
          </div>

          <div className="lg:w-3/4 mx-10 mt-10">
            {renderSections(articleContent)}
          </div>
        </div>
      </main>
    </Template >
  );
}

export default Article;