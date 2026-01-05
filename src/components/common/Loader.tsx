import React from 'react';

const Loader = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-50 z-50">
      <div className="spinnerContainer">
        <div className="spinner" />
        <div className="loader">
          <p>loading</p>
          <div className="words">
            <span className="word">audits</span>
            <span className="word">branches</span>
            <span className="word">reports</span>
            <span className="word">data</span>
            <span className="word">audits</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .spinnerContainer {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .spinner {
          width: 56px;
          height: 56px;
          display: grid;
          border: 4px solid #0000;
          border-radius: 50%;
          border-right-color: #4F46E5;
          animation: tri-spinner 1s infinite linear;
        }

        .spinner::before,
        .spinner::after {
          content: "";
          grid-area: 1/1;
          margin: 2px;
          border: inherit;
          border-radius: 50%;
          animation: tri-spinner 2s infinite;
        }

        .spinner::after {
          margin: 8px;
          animation-duration: 3s;
        }

        @keyframes tri-spinner {
          100% {
            transform: rotate(1turn);
          }
        }

        .loader {
          color: #4a4a4a;
          font-family: inherit;
          font-weight: 500;
          font-size: 25px;
          box-sizing: content-box;
          height: 40px;
          padding: 10px 10px;
          display: flex;
          border-radius: 8px;
        }

        .words {
          overflow: hidden;
        }

        .word {
          display: block;
          height: 100%;
          padding-left: 6px;
          color: #4F46E5;
          animation: cycle-words 5s infinite;
        }

        @keyframes cycle-words {
          10% {
            transform: translateY(-105%);
          }

          25% {
            transform: translateY(-100%);
          }

          35% {
            transform: translateY(-205%);
          }

          50% {
            transform: translateY(-200%);
          }

          60% {
            transform: translateY(-305%);
          }

          75% {
            transform: translateY(-300%);
          }

          85% {
            transform: translateY(-405%);
          }

          100% {
            transform: translateY(-400%);
          }
        }
      `}</style>
    </div>
  );
}

export default Loader;