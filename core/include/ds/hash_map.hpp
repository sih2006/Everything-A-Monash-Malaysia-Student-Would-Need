// A hash map from text keys to values, built by hand (no std::unordered_map).
//
// A hash function turns the key into a number, and that number picks a bucket.
// Keys that land in the same bucket are kept in a short chain of nodes
// ("separate chaining"). The table doubles when it gets 75% full, so chains
// stay short.
//
//   Operation          Average time   Worst time   Extra space
//   put / find / erase O(1)           O(n)         O(1)
//   for_each           O(n + b)       O(n + b)     O(1)      (b = number of buckets)
//   whole structure    -              -            O(n + b)
//
// The worst case needs every key to land in one bucket, which the FNV-1a hash
// makes very unlikely for unit codes.
#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <utility>

namespace ds {

template <typename V>
class HashMap {
    struct Node {
        std::string key;
        V value;
        Node* next;
    };

public:
    HashMap() = default;

    HashMap(const HashMap& other) {
        other.for_each([this](const std::string& key, const V& value) { put(key, value); });
    }

    HashMap(HashMap&& other) noexcept : buckets_(other.buckets_), bucket_count_(other.bucket_count_), size_(other.size_) {
        other.buckets_ = nullptr;
        other.bucket_count_ = 0;
        other.size_ = 0;
    }

    HashMap& operator=(HashMap other) noexcept {
        swap(other);
        return *this;
    }

    ~HashMap() {
        clear();
        delete[] buckets_;
    }

    void swap(HashMap& other) noexcept {
        std::swap(buckets_, other.buckets_);
        std::swap(bucket_count_, other.bucket_count_);
        std::swap(size_, other.size_);
    }

    std::size_t size() const { return size_; }
    bool empty() const { return size_ == 0; }
    std::size_t bucket_count() const { return bucket_count_; }

    // Adds the pair, or replaces the value if the key is already there.
    // Returns true when the key is new.
    bool put(const std::string& key, V value) {
        if (Node* found = find_node(key)) {
            found->value = std::move(value);
            return false;
        }
        if (bucket_count_ == 0 || (size_ + 1) * 4 > bucket_count_ * 3) grow();
        std::size_t index = hash(key) % bucket_count_;
        buckets_[index] = new Node{key, std::move(value), buckets_[index]};
        ++size_;
        return true;
    }

    // Returns a pointer to the value, or nullptr if the key is not in the map.
    V* find(const std::string& key) {
        Node* node = find_node(key);
        return node ? &node->value : nullptr;
    }

    const V* find(const std::string& key) const {
        const Node* node = find_node(key);
        return node ? &node->value : nullptr;
    }

    bool contains(const std::string& key) const { return find_node(key) != nullptr; }

    // Removes the key. Returns true if it was there.
    bool erase(const std::string& key) {
        if (bucket_count_ == 0) return false;
        std::size_t index = hash(key) % bucket_count_;
        Node* before = nullptr;
        for (Node* n = buckets_[index]; n != nullptr; before = n, n = n->next) {
            if (n->key != key) continue;
            if (before == nullptr) buckets_[index] = n->next;
            else before->next = n->next;
            delete n;
            --size_;
            return true;
        }
        return false;
    }

    void clear() {
        for (std::size_t i = 0; i < bucket_count_; ++i) {
            Node* n = buckets_[i];
            while (n != nullptr) {
                Node* next = n->next;
                delete n;
                n = next;
            }
            buckets_[i] = nullptr;
        }
        size_ = 0;
    }

    // Calls visit(key, value) once for every pair. The order is not defined.
    template <typename Visit>
    void for_each(Visit visit) {
        for (std::size_t i = 0; i < bucket_count_; ++i) {
            for (Node* n = buckets_[i]; n != nullptr; n = n->next) visit(n->key, n->value);
        }
    }

    template <typename Visit>
    void for_each(Visit visit) const {
        for (std::size_t i = 0; i < bucket_count_; ++i) {
            for (const Node* n = buckets_[i]; n != nullptr; n = n->next) visit(n->key, n->value);
        }
    }

    // FNV-1a: a small, well-known hash. It mixes every character into the result.
    static std::size_t hash(const std::string& key) {
        std::uint64_t h = 1469598103934665603ull;
        for (unsigned char c : key) {
            h ^= c;
            h *= 1099511628211ull;
        }
        return static_cast<std::size_t>(h);
    }

private:
    Node* find_node(const std::string& key) const {
        if (bucket_count_ == 0) return nullptr;
        for (Node* n = buckets_[hash(key) % bucket_count_]; n != nullptr; n = n->next) {
            if (n->key == key) return n;
        }
        return nullptr;
    }

    // Doubles the table and moves every node to its new bucket. No node is copied.
    void grow() {
        std::size_t bigger_count = bucket_count_ == 0 ? 8 : bucket_count_ * 2;
        Node** bigger = new Node*[bigger_count]();
        for (std::size_t i = 0; i < bucket_count_; ++i) {
            Node* n = buckets_[i];
            while (n != nullptr) {
                Node* next = n->next;
                std::size_t index = hash(n->key) % bigger_count;
                n->next = bigger[index];
                bigger[index] = n;
                n = next;
            }
        }
        delete[] buckets_;
        buckets_ = bigger;
        bucket_count_ = bigger_count;
    }

    Node** buckets_ = nullptr;
    std::size_t bucket_count_ = 0;
    std::size_t size_ = 0;
};

}  // namespace ds
