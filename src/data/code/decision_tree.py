import numpy as np

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
