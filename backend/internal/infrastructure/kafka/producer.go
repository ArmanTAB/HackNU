package kafka

import (
	"context"
	"fmt"

	"github.com/segmentio/kafka-go"
)

type Producer struct {
	writer *kafka.Writer
}

func NewProducer(brokers []string, topic string) *Producer {
	return &Producer{
		writer: &kafka.Writer{
			Addr:                   kafka.TCP(brokers...),
			Topic:                  topic,
			Balancer:               &kafka.LeastBytes{},
			AllowAutoTopicCreation: true,
		},
	}
}

func (p *Producer) Publish(ctx context.Context, data []byte) error {
	err := p.writer.WriteMessages(ctx, kafka.Message{Value: data})
	if err != nil {
		return fmt.Errorf("kafka.Producer.Publish: %w", err)
	}
	return nil
}

func (p *Producer) Close() error {
	return p.writer.Close()
}
