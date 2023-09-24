const title2uri = (title) => {
    return title.toLowerCase().replace(/ /g, '-');
};

export default title2uri;