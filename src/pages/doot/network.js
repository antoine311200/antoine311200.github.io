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

const DootStyle = {
    "geography": "blue",
    "cinema": "red",
    "science": "lime",
    "history": "yellow",
    "art": "green",
    "technology": "slate",
    "music": "violet",
    "literature": "pink",
    "philosophy": "amber",
    "sports": "orange",
    "politics": "gray",
    "economics": "teal",
    "religion": "emerald",
}

const options = {
    physics: {
        enabled: true,
    },
    interaction: {
        hover: true,
        // hoverConnectedEdges: true,
        // selectConnectedEdges: false,
        // selectable: true,
        // selectConnectedNodes: false,
        navigationButtons: true,
    },
    layout: {
        hierarchical: false
    },
    nodes: {
        shape: "dot",
        size: 10,
        font: {
            size: 12
        },
        borderWidth: 2,
        // shadow: true
    },
    edges: {
        color: "#000000"
    },
};

const createEdges = (doots) => {
    // Create edge between doot of the same keyword and links
    let edges = [];
    // keywords as set
    let keywords = new Set();
    doots.forEach(doot => {
        if (doot.keywords) {
            doot.keywords.forEach(keyword => {
                keywords.add(keyword);
            });
        }
    });

    // Create edges between doots of the same keyword
    keywords.forEach(keyword => {
        let keywordDoots = doots.filter(doot => doot.keywords.includes(keyword));
        for (let i = 0; i < keywordDoots.length; i++) {
            for (let j = i + 1; j < keywordDoots.length; j++) {
                edges.push({
                    from: keywordDoots[i].id,
                    to: keywordDoots[j].id,
                    color: "#000000"
                });
                edges.push({
                    from: keywordDoots[j].id,
                    to: keywordDoots[i].id,
                    color: "#000000"
                });
            }
        }
    });

    return edges;
};

const DootNetwork = ({ parameters }) => {

    const { doots } = useContext(DootContext);

    dummy_graph = {
        nodes: doots.map((doot, index) => {
            return {
                id: doot.id,
                label: doot.title,
            }
        }),
        edges: createEdges(doots)
    };

    useEffect(() => {
        dummy_graph = {
            nodes: doots.map((doot, index) => {
                return {
                    id: index,
                    label: doot.title,
                }
            }),
            edges: createEdges(doots)
        };
    }, [doots]);

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