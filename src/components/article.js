import React, { useState, useEffect } from 'react';
import Template from '../components/template';
import 'katex/dist/katex.min.css';
import { useParams } from 'react-router-dom';

import title2uri from '../utils';

const DUMMY = {
  title: 'Product 1',
  date: '2021-01-01',
  description: 'A great product for your needs.',
  keywords: ['product', 'electronics', 'gadget'],
  content: [
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
      ]
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
    }]
};

const Article = ({ articleContent = DUMMY, data = undefined }) => {
  // Sample content with sections, subsections, and subsubsections

  const { title } = useParams();

  articleContent = data.find(
    (a) => encodeURIComponent(title2uri(a.title)) === title2uri(title)
  );

  const [activeSection, setActiveSection] = useState(null);

  const handleSectionClick = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    document.title = `Blog - ${articleContent.title}`;
  }, []);

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

      processSections(articleContent.content);

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
        <h2 className="text-2xl font-semibold mb-2">{section.title}</h2>
        <p>{section.content}</p>
        {section.subsections && renderSections(section.subsections)}
      </section>
    ));
  };

  const renderTableOfContents = (sections, depth) => {
    const maxLength = 30;
    console.log(sections[0].title.length);
    return (
      <ul className={`${depth == 0 ? 'ml-2' : 'ml-4'}`}>
        {sections.map((section) => (
          <li key={section.id} style={
            {
              fontSize: `${16 - depth * 2}px`,
              marginTop: `5px`
            }
          }>
            <a
              className={
                `cursor-pointer relative group block transition-all duration-100 ease-in-out
                ${activeSection === section.id ? 'font-semibold border-l-4 border-black px-2 py-1' : ''}}
                `}
              onClick={() => handleSectionClick(section.id)}
            >
              {section.title.length > maxLength ? section.title.slice(0, maxLength) + "..." : section.title}
              {section.title.length > maxLength ? (<span className="absolute bg-gray-200 text-gray-800 p-2 text-sm rounded-md opacity-0 pointer-events-none transition-opacity duration-300 ease-in-out group-hover:opacity-100 top-10 left-1/2 transform -translate-x-3/4 z-10">
                {section.title}
              </span>) : null}
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
          <h1 className="text-3xl font-semibold">{articleContent.title}</h1>
          <p className="text-gray-600">Posted on September 21, 2023</p>
          <hr className="mb-4" />

          <div className="lg:w-1/4 lg:ml-4 lg:fixed lg:right-5 lg:block">
            <div className="sticky top-16">
              <h2 className="text-xl font-semibold mb-2">Table of Contents</h2>
              {renderTableOfContents(articleContent.content, 0)}
            </div>
          </div>

          <hr className="mb-4 md:hidden" />

          <div className="lg:w-3/4 mx-2 md:mx-2 mt-10 text-justify">
            {renderSections(articleContent.content)}
          </div>
        </div>
      </main>
    </Template >
  );
}

export default Article;