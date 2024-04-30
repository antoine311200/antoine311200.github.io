import React from "react";
import Graph from "react-graph-vis";

const dummy_graph = {
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

const options = {
    physics: {
        enabled: true,
    },
    interaction: {
        hover: true,
        hoverConnectedEdges: true,
        selectConnectedEdges: false,
        selectable: true,
        selectConnectedNodes: false,
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
    smooth: true,
    zoom: 10,
};

const DootNetwork = ({ parameters }) => {
    const events = {
        select: function (event) {
            let { nodes, edges } = event;
        }
    };

    return (
        <div className="w-1/2 h-1/2 bg-white rounded-xl">
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