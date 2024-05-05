import React, { useContext, useEffect } from "react";
import Graph from "react-graph-vis";

import { DootContext } from "./dootcontext";

let dummy_graph = {
    nodes: [
        { id: 1, label: "Node 1" },
        { id: 2, label: "Node 2" },
        { id: 3, label: "Node 3" },
        { id: 4, label: "Node 4" },
        { id: 5, label: "Node 5" }
    ],
    edges: [
        { from: 1, to: 2 },
        { from: 1, to: 3 },
        { from: 2, to: 4 },
        { from: 2, to: 5 }
    ]
};

export const DootStyle = {
    "geography": "#2b6cb0",
    "cinema": "#e53e3e",
    "science": "#48bb78",
    "history": "#f6e05e",
    "art": "#38a169",
    "technology": "#718096",
    "music": "#9f7aea",
    "literature": "#ed64a6",
    "philosophy": "#f6ad55",
    "sports": "#ed8936",
    "politics": "#718096",
    "economics": "#38b2ac",
    "religion": "#48bb78",
}

const options = {
    // physics: {
    //     enabled: true,
    // },
    // interaction: {
    //     hover: true,
    //     // hoverConnectedEdges: true,
    //     // selectConnectedEdges: false,
    //     // selectable: true,
    //     // selectConnectedNodes: false,
    //     navigationButtons: true,
    // },
    // layout: {
    //     hierarchical: false
    // },
    // nodes: {
    //     shape: "dot",
    //     size: 10,
    //     font: {
    //         size: 12
    //     },
    //     borderWidth: 2,
    //     // shadow: true
    // },
    // edges: {
    //     color: "#000000"
    // },
    nodes:{
        shape: "dot",
        size: 14,
        borderWidth: 0.5,
        // scaling: {
        //     min: 10,
        //     max: 30,
        //     label: {
        //         min: 8,
        //         max: 30,
        //         drawThreshold: 12,
        //         maxVisible: 20
        //     }
        // },
        font: {
            size: 12,
            face: "Tahoma"
        }
    },
    edges: {
        width: 0.15,
        // color: {inherit: "from"},
        smooth: {
            type: "continuous"
        },
        arrows: {
            to: {enabled: false, scaleFactor: 0.5},
            middle: {enabled: false, scaleFactor: 0.5},
            from: {enabled: false, scaleFactor: 0.5}
        }
    },
    layout: {
        hierarchical: false,
        improvedLayout: false,
    },
    physics: true,
    interaction: {
        navigationButtons: true,
        hover: true,
        // tooltipDelay: 200,
        // hideEdgesOnDrag: true,
        // hideEdgesOnZoom: true
    },
};

const createEdges = (doots) => {
    // Create edge between doot of the same keyword and links
    let edges = [];
    // keywords as set
    let tags = new Set();
    // doots.forEach(doot => {
    //     if (doot.tags) {
    //         doot.tags.forEach(keyword => {
    //             tags.add(keyword);
    //         });
    //     }
    // });

    // // Create edges between doots of the same keyword
    // tags.forEach(keyword => {
    //     let tagDoots = doots.filter(doot => doot.tags.includes(keyword));
    //     for (let i = 0; i < tagDoots.length; i++) {
    //         for (let j = i + 1; j < tagDoots.length; j++) {
    //             edges.push({
    //                 from: tagDoots[i].id,
    //                 to: tagDoots[j].id,
    //                 color: "#000000"
    //             });
    //             // edges.push({
    //             //     from: tagDoots[j].id,
    //             //     to: tagDoots[i].id,
    //             //     color: "#000000"
    //             // });
    //         }
    //     }
    // });

    return edges;
};

const DootNetwork = ({ parameters }) => {

    const { doots, gridDoots, nodes, edges } = useContext(DootContext);
    // dummy_graph = {
    //     nodes: gridDoots.map((doot, index) => {
    //         return {
    //             id: doot.id,
    //             label: doot.title,
    //             color: DootStyle[doot.tags[0]],
    //             group: doot.tags[0] || "none",
    //         }
    //     }),
    //     edges: createEdges(gridDoots)
    // };

    // useEffect(() => {
    //     dummy_graph = {
    //         nodes: gridDoots.map((doot, index) => {
    //             return {
    //                 id: index,
    //                 label: doot.title,
    //                 color: DootStyle[doot.tags[0]],
    //                 group: doot.tags[0] || "none",
    //             }
    //         }),
    //         edges: createEdges(gridDoots)
    //     };
    // }, [gridDoots]);

    dummy_graph = {nodes: nodes, edges: edges};

    const events = {
        select: function (event) {
            let { nodes, edges } = event;
        }
    };

    return (
        <div className="bg-white rounded-xl h-screen max-h-[500px]">
            <Graph
                graph={dummy_graph}
                options={options}
                events={events}
                getNetwork={network => {
                }}
            />
        </div>
    );

}

export default DootNetwork;