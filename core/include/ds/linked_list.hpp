// A singly linked list, built by hand (no std::list).
//
// Each item lives in its own node, and each node points to the next one.
// Adding at either end never moves the other items.
//
//   Operation              Time         Extra space
//   push_back / push_front O(1)         O(1)
//   pop_front              O(1)         O(1)
//   find / remove_first    O(n)         O(1)
//   sort (merge sort)      O(n log n)   O(log n) for the recursion
//   whole structure        -            O(n), one pointer per item
//
// Merge sort is used because it suits a linked list: it only relinks nodes,
// never copies items, and it keeps equal items in their original order.
#pragma once

#include <cstddef>
#include <utility>

namespace ds {

template <typename T>
class LinkedList {
    struct Node {
        T value;
        Node* next;
    };

public:
    LinkedList() = default;

    LinkedList(const LinkedList& other) {
        for (const Node* n = other.head_; n != nullptr; n = n->next) push_back(n->value);
    }

    LinkedList(LinkedList&& other) noexcept : head_(other.head_), tail_(other.tail_), size_(other.size_) {
        other.head_ = other.tail_ = nullptr;
        other.size_ = 0;
    }

    LinkedList& operator=(LinkedList other) noexcept {
        swap(other);
        return *this;
    }

    ~LinkedList() { clear(); }

    void swap(LinkedList& other) noexcept {
        std::swap(head_, other.head_);
        std::swap(tail_, other.tail_);
        std::swap(size_, other.size_);
    }

    std::size_t size() const { return size_; }
    bool empty() const { return size_ == 0; }

    void push_back(T value) {
        Node* node = new Node{std::move(value), nullptr};
        if (tail_ == nullptr) head_ = node;
        else tail_->next = node;
        tail_ = node;
        ++size_;
    }

    void push_front(T value) {
        head_ = new Node{std::move(value), head_};
        if (tail_ == nullptr) tail_ = head_;
        ++size_;
    }

    // Removes the first item. Returns false if the list is empty.
    bool pop_front() {
        if (head_ == nullptr) return false;
        Node* old = head_;
        head_ = head_->next;
        if (head_ == nullptr) tail_ = nullptr;
        delete old;
        --size_;
        return true;
    }

    // Returns a pointer to the first item the test accepts, or nullptr.
    template <typename Test>
    T* find(Test test) {
        for (Node* n = head_; n != nullptr; n = n->next) {
            if (test(n->value)) return &n->value;
        }
        return nullptr;
    }

    template <typename Test>
    const T* find(Test test) const {
        for (const Node* n = head_; n != nullptr; n = n->next) {
            if (test(n->value)) return &n->value;
        }
        return nullptr;
    }

    // Removes the first item the test accepts. Returns true if one was removed.
    template <typename Test>
    bool remove_first(Test test) {
        Node* before = nullptr;
        for (Node* n = head_; n != nullptr; before = n, n = n->next) {
            if (!test(n->value)) continue;
            if (before == nullptr) head_ = n->next;
            else before->next = n->next;
            if (n == tail_) tail_ = before;
            delete n;
            --size_;
            return true;
        }
        return false;
    }

    void clear() {
        while (head_ != nullptr) {
            Node* next = head_->next;
            delete head_;
            head_ = next;
        }
        tail_ = nullptr;
        size_ = 0;
    }

    // Sorts the list. `before(a, b)` must return true when a belongs before b.
    template <typename Before>
    void sort(Before before) {
        head_ = merge_sort(head_, before);
        tail_ = head_;
        while (tail_ != nullptr && tail_->next != nullptr) tail_ = tail_->next;
    }

    // A forward iterator, so the list works in a range-based for loop.
    template <typename NodeT, typename ValueT>
    class Iter {
    public:
        explicit Iter(NodeT* node) : node_(node) {}
        ValueT& operator*() const { return node_->value; }
        Iter& operator++() {
            node_ = node_->next;
            return *this;
        }
        bool operator!=(const Iter& other) const { return node_ != other.node_; }

    private:
        NodeT* node_;
    };

    Iter<Node, T> begin() { return Iter<Node, T>(head_); }
    Iter<Node, T> end() { return Iter<Node, T>(nullptr); }
    Iter<const Node, const T> begin() const { return Iter<const Node, const T>(head_); }
    Iter<const Node, const T> end() const { return Iter<const Node, const T>(nullptr); }

private:
    // Splits the chain in two halves, sorts each half, then merges them.
    template <typename Before>
    static Node* merge_sort(Node* head, Before before) {
        if (head == nullptr || head->next == nullptr) return head;

        // `slow` moves one step for every two of `fast`, so it stops at the middle.
        Node* slow = head;
        Node* fast = head->next;
        while (fast != nullptr && fast->next != nullptr) {
            slow = slow->next;
            fast = fast->next->next;
        }
        Node* second = slow->next;
        slow->next = nullptr;

        Node* a = merge_sort(head, before);
        Node* b = merge_sort(second, before);

        // Merge: keep taking the smaller front node. Taking from `a` on a tie keeps the sort stable.
        Node* first = nullptr;
        Node* last = nullptr;
        while (a != nullptr && b != nullptr) {
            Node*& pick = before(b->value, a->value) ? b : a;
            Node* taken = pick;
            pick = pick->next;
            if (last == nullptr) first = taken;
            else last->next = taken;
            last = taken;
        }
        Node* rest = (a != nullptr) ? a : b;
        if (last == nullptr) first = rest;
        else last->next = rest;
        return first;
    }

    Node* head_ = nullptr;
    Node* tail_ = nullptr;
    std::size_t size_ = 0;
};

}  // namespace ds
