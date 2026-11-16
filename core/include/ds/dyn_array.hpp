// A growable array, built by hand (no std::vector).
//
// Items sit next to each other in one block of memory, so reading by position
// is one step and walking through all items is fast.
//
//   Operation              Time            Extra space
//   read / write by index  O(1)            O(1)
//   push_back              O(1) amortised  O(n) only when it grows
//   remove_at              O(n)            O(1)
//   whole structure        -               O(n), at most 2x the items held
//
// "Amortised" means: most pushes are one step. When the block is full it
// doubles, which costs n steps, but that happens so rarely that the average
// stays constant.
#pragma once

#include <cstddef>
#include <utility>

namespace ds {

template <typename T>
class DynArray {
public:
    DynArray() = default;

    DynArray(const DynArray& other) {
        reserve(other.size_);
        for (std::size_t i = 0; i < other.size_; ++i) data_[i] = other.data_[i];
        size_ = other.size_;
    }

    DynArray(DynArray&& other) noexcept : data_(other.data_), size_(other.size_), capacity_(other.capacity_) {
        other.data_ = nullptr;
        other.size_ = 0;
        other.capacity_ = 0;
    }

    // Copy-and-swap: takes its argument by value, so it handles copy and move.
    DynArray& operator=(DynArray other) noexcept {
        swap(other);
        return *this;
    }

    ~DynArray() { delete[] data_; }

    void swap(DynArray& other) noexcept {
        std::swap(data_, other.data_);
        std::swap(size_, other.size_);
        std::swap(capacity_, other.capacity_);
    }

    std::size_t size() const { return size_; }
    std::size_t capacity() const { return capacity_; }
    bool empty() const { return size_ == 0; }

    T& operator[](std::size_t index) { return data_[index]; }
    const T& operator[](std::size_t index) const { return data_[index]; }

    void push_back(T value) {
        if (size_ == capacity_) reserve(capacity_ == 0 ? 4 : capacity_ * 2);
        data_[size_++] = std::move(value);
    }

    // Removes the item at `index` and closes the gap. Returns false if there is no such item.
    bool remove_at(std::size_t index) {
        if (index >= size_) return false;
        for (std::size_t i = index + 1; i < size_; ++i) data_[i - 1] = std::move(data_[i]);
        --size_;
        data_[size_] = T();   // release whatever the last slot was holding
        return true;
    }

    void clear() {
        for (std::size_t i = 0; i < size_; ++i) data_[i] = T();
        size_ = 0;
    }

    void reserve(std::size_t wanted) {
        if (wanted <= capacity_) return;
        T* bigger = new T[wanted];
        for (std::size_t i = 0; i < size_; ++i) bigger[i] = std::move(data_[i]);
        delete[] data_;
        data_ = bigger;
        capacity_ = wanted;
    }

    // Lets the array be used in a range-based for loop.
    T* begin() { return data_; }
    T* end() { return data_ + size_; }
    const T* begin() const { return data_; }
    const T* end() const { return data_ + size_; }

private:
    T* data_ = nullptr;
    std::size_t size_ = 0;
    std::size_t capacity_ = 0;
};

}  // namespace ds
