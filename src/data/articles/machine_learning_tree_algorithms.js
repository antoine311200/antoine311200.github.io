import { Paragraph, Remark, Image } from '../../components/helper';
import ReactMarkdown from 'react-markdown';
import { Prism as Code } from 'react-syntax-highlighter';
import { dark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import React from 'react';

const article_tree_ml = {
  title: 'Most Of ML : Tree based algorithms (decision trees, random forest, gradient boosting)',
  date: '21 October 2023',
  description: 'A short and concise guide to tree based algorithms in machine learning (decision trees, random forest, gradient boosting)',
  keywords: ['Mathematics', 'Machine Learning', 'Algorithms'],
  imagePath: '/images/decision_trees/banner.PNG',
  content: [
    {
      id: 'introduction',
      title: 'Introduction',
      content: (
        <span>
          <p className="my-4" />
          <Paragraph>Decision trees are a class of predictor (but also regressor) built upon the tree data structure that predtics the label associated to a given sample by running the latter going through the tree from the root until reaching a leaf. Each node represents a (splitting) condition on one feature that state which child the sample has to pass by. Each leaf represent a given label of the problem and gives its prediction label to the sample when reached during inference.</Paragraph>
          <Image src="\images\decision_trees\binary_decision_tree.PNG" caption="Binary Decision tree" />
          <Image src="\images\decision_trees\decision_classification_tree.PNG" caption="3 Classes Decision tree" />
        </span>
      )
    },
    {
      id: 'decision-trees',
      title: 'Decision trees',
      content: (
        <span>
          <p className="my-4" />
        </span>
      ),
      subsections: [
        {
          id: "splitting",
          title: "Splitting decision",
          content: (
            <span>
              <p className="my-4" />
              <Paragraph>{`When constructing a decision tree, at each iteration we try to split a leaf and construct the rest of the tree for its left and right children given a partition of the data that went to the leaf. This spliting decision is motivated upon a simple critera : among all possible split conditions find the one that maximise some gain, we also say that we try to minimise the impurity of the split. There are several definitions of the gain as we will see right after but the gist of it is to quantify the improvement of the split compared to no split. Mathematically, the gain for a specific feature $i \\in \\{1, \\cdots, n\\}$ and a training set $T$ is defined by
              $$\\begin{align*} G(T, i) & = f(T) - \\frac{|T_{X_i \\leq a}|}{|T|} f(T_{X_i \\leq a}) \\\\
               & - \\frac{|T_{X_i > a}|}{|T|} f(T_{X_i > a})
               \\end{align*}$$

              where $f$ is a specific function. This formula states that the gain of $T$ is the current information minus the weighted average of the information for the proportion of samples with feature $i$ less than and greater than $a$. `}</Paragraph>
            </span>
          ),
          subsections: [
            {
              id: "information-gain",
              title: "Information Gain",
              content: (
                <span>
                  <p className="my-4" />
                  <Paragraph></Paragraph>
                </span>
              ),
            },
            {
              id: "gini-index",
              title: "Gini Index",
              content: (
                <span>
                  <p className="my-4" />
                </span>
              ),
            }
          ]
        },{
          id: "categorical-data",
            title: "Categorical Data",
            content: (
              <span>
                <p className="my-4" />
                <Paragraph>In order to make regression or classification with decision trees on data with categorical values, these data need to be one-hoted. Indeed, as we have just seen decision trees make use of splitting criteria based on some threshold on the data, thus, categorical data have to be made in such a form that we can perform decision based on wether or not a sample is of the category we are considering.
                  One-hot is thus the solution even though one has to be careful with the number of categories as it can lead to a very large number of features.
                </Paragraph>
              </span>
            ),
          },
        {
        id: "regression-tree",
          title: "Regression Trees",
          content: (
            <span>
              <p className="my-4" />
              <Paragraph>Regression with decision tree simply boils down to a classification decision tree except that the prediction of a sample will be the average of all points of the training set that fall down to this leaf. The information gain needs also some refinement : instead of using the Gini index or the entropy to measure the impurity, in the case of regression we will choose to reduce the variance of a given set of samples.
                {`$$\\mathbb{V}(T) = \\frac{1}{|T|} \\sum_{i \\in T} (y_i - \\bar{y})^2$$`}
                {`$$\\begin{align*} G(T, i) & = \\mathbb{V}(T) - \\frac{|T_{X_i \\leq a}|}{|T|} \\mathbb{V}(T_{X_i \\leq a}) \\\\ & - \\frac{|T_{X_i > a}|}{|T|} \\mathbb{V}(T_{X_i > a}) \\end{align*}$$`}
              </Paragraph>
            </span>
          ),
        },
        {
        id: "algorithms",
          title: "Algorithms for Decision Trees",
          content: (
            <span>
              <p className="my-4" />
            </span>
          ),
          subsections: [
            {
              id: "cart",
              title: "CART, ID3 and C4.5",
              content: (
                <span>
                  <p className="my-4" />
                  <Code language="python" style={dark}
                  customStyle={{ lineHeight: "1", fontSize: "0.8em"}}
                  codeTagProps = {{style: {lineHeight: "inherit", fontSize: "inherit"}}}
                  >{`import numpy as np

class DecisionTree:
    class Node:
        def __init__(
            self, feature=None, threshold=None, left=None, right=None, *, value=None
        ):
            self.feature = feature
            self.threshold = threshold
            self.left = left
            self.right = right
            self.value = value

    def __init__(self, max_depth=None, min_samples_split=2, algorithm="gini"):
        self.max_depth = max_depth
        self.min_samples_split = min_samples_split
        self.algorithm = algorithm
        self.tree = None

    def _build_tree(self, X, y, depth=0):
        n_samples, n_features = X.shape
        n_labels = len(np.unique(y))

        if (
            (depth >= self.max_depth and self.max_depth is not None)
            or n_labels == 1
            or n_samples < self.min_samples_split
        ):
            if self.algorithm == "regression": leaf_value = np.mean(y)
            else: leaf_value = max(list(y), key=list(y).count)
            return self.Node(value=leaf_value)

        # Select random features
        feature_idxs = np.random.choice(n_features, n_features, replace=False)

        best_feature, best_threshold, left_idxs, right_idxs = self._best_criteria(X, y, feature_idxs)

        left = self._build_tree(X[left_idxs, :], y[left_idxs], depth + 1)
        right = self._build_tree(X[right_idxs, :], y[right_idxs], depth + 1)

        return self.Node(best_feature, best_threshold, left, right)

    def _best_criteria(self, X, y, feature_idxs):
        best_gain = -float("inf")
        split_idx, split_threshold = None, None
        for feature_idx in feature_idxs:
            X_column = X[:, feature_idx]
            thresholds = np.unique(X_column)
            for threshold in thresholds:
                gain = self._information_gain(y, X_column, threshold)
                if gain > best_gain:
                    best_gain = gain
                    split_idx = feature_idx
                    split_threshold = threshold

        left_idxs, right_idxs = self._split(X[:, split_idx], split_threshold)

        return split_idx, split_threshold, left_idxs, right_idxs

    def _split(self, X_column, split_threshold):
        left_idxs = np.argwhere(X_column <= split_threshold).flatten()
        right_idxs = np.argwhere(X_column > split_threshold).flatten()
        return left_idxs, right_idxs

    def _information_gain(self, y, X_column, split_threshold):
        X_left, X_right = self._split(X_column, split_threshold)
        weight_left = len(X_left) / len(X_column)
        weight_right = len(X_right) / len(X_column)

        if self.algorithm == "gini":
            gain = self._gini(y) - (weight_left * self._gini(y[X_left]) + weight_right * self._gini(y[X_right]))
        elif self.algorithm == "entropy":
            gain = self._entropy(y) - (weight_left * self._entropy(y[X_left]) + weight_right * self._entropy(y[X_right]))
        elif self.algorithm == "training_error":
            gain = self._training_error(y) - (weight_left * self._training_error(y[X_left]) + weight_right * self._training_error(y[X_right]))
        elif self.algorithm == "regression":
            gain = np.var(y) - (weight_left * np.var(y[X_left]) + weight_right * np.var(y[X_right]))
        else:
            raise Exception("Unknown algorithm")

        return gain

    def _gini(self, y):
        _, counts = np.unique(y, return_counts=True)
        probs = counts / len(y)
        return 1 - sum([p ** 2 for p in probs])

    def _entropy(self, y):
        _, counts = np.unique(y, return_counts=True)
        probs = counts / len(y)
        return sum([-p * np.log2(p) for p in probs])

    def _training_error(self, y):
        _, counts = np.unique(y, return_counts=True)
        probs = counts / len(y)
        return 1 - max(probs)

    def fit(self, X, y):
        self.tree = self._build_tree(X, y)

    def predict(self, X):
        return [self._predict(inputs) for inputs in X]

    def _predict(self, inputs):
        node = self.tree
        while node.value is None:
            if inputs[node.feature] <= node.threshold:  node = node.left
            else: node = node.right
        return node.value

`}
                  </Code>
                </span>
              ),
            }
          ]
        }
      ]
    },
    {
      id: 'random-forest',
      title: 'Random Forest',
      content: (
        <span>
          <p className="my-4" />
        </span>
      )
    },
  ]
};

export default article_tree_ml;